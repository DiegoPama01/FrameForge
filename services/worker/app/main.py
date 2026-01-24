import os
import re
import uuid
import json
import shutil
import tempfile
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, Header, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="FrameForge Worker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the dashboard URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
TOKEN = os.environ.get("WORKER_TOKEN", "")
DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
PROJECTS_ROOT = DATA_ROOT / "projects"
ASSETS_ROOT = DATA_ROOT / "assets"

executor = ThreadPoolExecutor(max_workers=4)
jobs_db: Dict[str, Dict[str, Any]] = {}

# --- Models ---
class Job(BaseModel):
    project_path: str
    input_audio: str
    language: str = "es"
    model: str = "small"
    do_preprocess: bool = True
    do_transcribe: bool = False
    silence_threshold_db: int = -35
    silence_duration_s: float = 0.5

class TranscribeJob(BaseModel):
    project_path: str
    input_audio: str = "audio_clean.wav"
    language: str = "es"
    model: str = "small"
    output_name: str = "subtitles.srt"

class TTSRequest(BaseModel):
    project_id: str
    text: str
    voice: str = "es-ES-AlvaroNeural"
    rate: str = "+0%"
    volume: str = "+0%"
    output_name: str = "voice.mp3"

# --- Utils ---
def slugify(value: str) -> str:
    import unicodedata
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value.lower())
    return re.sub(r'[-\s]+', '-', value).strip('-_')

def auth(x_worker_token: str = Header(default="")):
    if TOKEN and x_worker_token != TOKEN:
        raise HTTPException(status_code=401, detail="Bad token")

def run_cmd(cmd: list[str], check: bool = True) -> int:
    print(f"--- Running: {' '.join(cmd)}", flush=True)
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as tmp:
        tmp_path = tmp.name
        p = subprocess.run(cmd, stdout=tmp, stderr=subprocess.STDOUT, text=True)
    
    try:
        if p.returncode != 0 and check:
            with open(tmp_path, "r", encoding="utf-8", errors="replace") as fh:
                tail = fh.read()[-4000:]
            print(f"--- Error (code {p.returncode}):\n{tail}", flush=True)
            raise Exception(f"Command failed (exit {p.returncode}): {tail}")
        
        print(f"--- Finished (code {p.returncode})", flush=True)
        return p.returncode
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

def audio_duration_seconds(path: Path) -> float:
    if not path.exists():
        return 0.0
    p = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    try:
        return float(p.stdout.strip())
    except Exception:
        return 0.0

def run_capture(cmd: list[str]) -> str:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if p.returncode != 0:
        raise Exception(p.stdout[-4000:])
    return p.stdout

def reduce_silence_half(src: Path, dst: Path, threshold_db: int, min_duration_s: float) -> None:
    detect = run_capture([
        "ffmpeg", "-i", str(src),
        "-af", f"silencedetect=noise={threshold_db}dB:d={min_duration_s}",
        "-f", "null", "-",
    ])

    silences: list[tuple[float, float]] = []
    current_start: float | None = None
    for line in detect.splitlines():
        m = re.search(r"silence_start:\s*([0-9.]+)", line)
        if m:
            current_start = float(m.group(1))
            continue
        m = re.search(r"silence_end:\s*([0-9.]+)", line)
        if m and current_start is not None:
            silences.append((current_start, float(m.group(1))))
            current_start = None

    duration = audio_duration_seconds(src)
    if current_start is not None and duration > 0:
        silences.append((current_start, duration))

    if not silences or duration <= 0:
        run_cmd(["ffmpeg", "-y", "-i", str(src), "-c:a", "pcm_s16le", str(dst)])
        return

    segments: list[tuple[float, float, bool]] = []
    cursor = 0.0
    for s_start, s_end in silences:
        if s_start > cursor:
            segments.append((cursor, s_start, False))
        if s_end > s_start:
            segments.append((s_start, s_end, True))
        cursor = s_end
    if cursor < duration:
        segments.append((cursor, duration, False))

    filters: list[str] = []
    labels: list[str] = []
    for i, (start, end, is_silence) in enumerate(segments):
        label = f"a{i}"
        chain = f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS"
        if is_silence:
            chain += ",atempo=2.0"
        chain += f"[{label}]"
        filters.append(chain)
        labels.append(f"[{label}]")

    concat = "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
    filter_complex = ";".join(filters + [concat])

    run_cmd([
        "ffmpeg", "-y", "-i", str(src), "-filter_complex", filter_complex,
        "-map", "[out]", str(dst),
    ])

def ensure_project_dirs(project_id: str) -> Path:
    if "/" in project_id or "\\" in project_id or ".." in project_id:
        raise HTTPException(status_code=400, detail="Invalid project_id")
    p = PROJECTS_ROOT / project_id
    dirs = [
        "audio/source", "audio/clean", "audio/tmp",
        "text/tmp", "video/source", "video/work", "video/final", "logs/jobs"
    ]
    for d in dirs:
        (p / d).mkdir(parents=True, exist_ok=True)
    return p

# --- System & Info ---
@app.get("/health")
def health():
    return {"ok": True, "timestamp": datetime.now().isoformat()}

@app.get("/version")
def version():
    return {
        "version": "1.0.0",
        "components": {
            "ffmpeg": run_capture(["ffmpeg", "-version"]).splitlines()[0],
            "whisper": "whisper.cpp (cli)",
        }
    }

@app.get("/config/global")
def get_config_global(deps = Depends(auth)):
    config_path = DATA_ROOT / "config_global.json"
    
    # Relevant environment variables as defaults
    env_config = {
        "REDDIT_CLIENT_ID": os.environ.get("REDDIT_CLIENT_ID", ""),
        "REDDIT_CLIENT_SECRET": os.environ.get("REDDIT_CLIENT_SECRET", ""),
        "REDDIT_USER_AGENT": os.environ.get("REDDIT_USER_AGENT", ""),
        "REDDIT_USERNAME": os.environ.get("REDDIT_USERNAME", ""),
        "REDDIT_PASSWORD": os.environ.get("REDDIT_PASSWORD", ""),
        "REDDIT_LIMIT": int(os.environ.get("REDDIT_LIMIT", 25)),
        "REDDIT_TIMEFRAME": os.environ.get("REDDIT_TIMEFRAME", "week"),
        "DRIVE_INDEX_ROOT_ID": os.environ.get("DRIVE_INDEX_ROOT_ID", ""),
        "DRIVE_SEEN_FILE_ID": os.environ.get("DRIVE_SEEN_FILE_ID", ""),
        "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", ""),
        "N8N_WEBHOOK_URL": os.environ.get("N8N_WEBHOOK_URL", ""),
        "SUBREDDITS": os.environ.get("SUBREDDITS", "askreddit,stories,confessions").split(","),
        "MIN_CHARS": int(os.environ.get("MIN_CHARS", 600)),
        "MAX_CHARS": int(os.environ.get("MAX_CHARS", 12000)),
        "default_model": "small",
        "default_language": "es"
    }

    if config_path.exists():
        try:
            stored_config = json.loads(config_path.read_text())
            env_config.update(stored_config)
        except Exception as e:
            print(f"Error reading config: {e}")
            
    return env_config

@app.put("/config/global")
def update_config_global(new_config: Dict[str, Any], deps = Depends(auth)):
    config_path = DATA_ROOT / "config_global.json"
    try:
        # Load existing for merging or just overwrite with the full payload
        stored_config = {}
        if config_path.exists():
            stored_config = json.loads(config_path.read_text())
        
        stored_config.update(new_config)
        config_path.write_text(json.dumps(stored_config, indent=4))
        
        # After updating, we could trigger a reload in other processes if needed
        # For now, processes just read from disk as needed.
        return {"ok": True, "message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")

@app.post("/trigger-n8n")
async def trigger_n8n(deps = Depends(auth)):
    config_path = DATA_ROOT / "config_global.json"
    webhook_url = os.environ.get("N8N_WEBHOOK_URL", "")
    
    if config_path.exists():
        try:
            config = json.loads(config_path.read_text())
            webhook_url = config.get("N8N_WEBHOOK_URL", webhook_url)
        except:
            pass

    if not webhook_url:
        raise HTTPException(status_code=400, detail="n8n Webhook URL not configured")

    # Use internal docker networking if possible, but user provided localhost
    # Replace localhost with 'n8n' if it fails, or let user decide.
    # We will try to replace 'localhost' with 'n8n' automatically for internal communication.
    print(f"--- Triggering n8n. Original: {webhook_url}", flush=True)
    internal_url = webhook_url.replace("localhost", "n8n").replace("127.0.0.1", "n8n")
    print(f"--- Internal attempt: {internal_url}", flush=True)
    
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Try Internal Docker network
        try:
            resp = await client.post(internal_url, json={"trigger": "dashboard"})
            print(f"--- Internal response ({resp.status_code}): {resp.text}", flush=True)
            if resp.status_code < 400:
                return {"ok": True, "n8n_response": resp.text}
            last_error = f"Status {resp.status_code}: {resp.text}"
        except Exception as e:
            print(f"--- Internal failed: {e}", flush=True)
            last_error = str(e)

        # 2. Try original URL (might work if running on host network or similar)
        print(f"--- Fallback attempt: {webhook_url}", flush=True)
        try:
            resp = await client.post(webhook_url, json={"trigger": "dashboard"})
            print(f"--- Original URL response ({resp.status_code}): {resp.text}", flush=True)
            if resp.status_code < 400:
                return {"ok": True, "n8n_response": resp.text}
            last_error = f"Status {resp.status_code}: {resp.text}"
        except Exception as e:
            print(f"--- Original URL failed: {e}", flush=True)
            last_error = str(e)

        raise HTTPException(status_code=500, detail=f"n8n trigger failed: {last_error}")

@app.post("/projects/harvest")
async def harvest_projects(deps = Depends(auth)):
    config = get_config_global(deps)
    subreddits = config.get("SUBREDDITS", [])
    timeframe = config.get("REDDIT_TIMEFRAME", "week")
    limit = config.get("REDDIT_LIMIT", 25)
    min_chars = config.get("MIN_CHARS", 600)
    max_chars = config.get("MAX_CHARS", 12000)
    
    import feedparser
    from bs4 import BeautifulSoup
    import httpx
    
    harvested = []
    errors = []
    
    for sub in subreddits:
        rss_url = f"https://www.reddit.com/r/{sub}/top/.rss?t={timeframe}&limit={limit}"
        print(f"--- Harvesting r/{sub}: {rss_url}", flush=True)
        try:
            # We use a user-agent to avoid being blocked by Reddit RSS
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FrameForge/1.0"}
            async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
                resp = await client.get(rss_url)
                if resp.status_code != 200:
                    errors.append(f"Subreddit r/{sub} returned {resp.status_code}")
                    continue
                
                feed = feedparser.parse(resp.text)
                for entry in feed.entries:
                    # Clean content
                    content_html = ""
                    if hasattr(entry, 'content'):
                        content_html = entry.content[0].value
                    elif hasattr(entry, 'summary'):
                        content_html = entry.summary
                    
                    if not content_html:
                        continue
                        
                    soup = BeautifulSoup(content_html, "html.parser")
                    text = soup.get_text(separator="\n").strip()
                    
                    # Filtering by length
                    if len(text) < min_chars or len(text) > max_chars:
                        continue
                    
                    # Create project ID from title
                    raw_id = entry.id.split("_")[-1] if "_" in entry.id else entry.id
                    clean_title = slugify(entry.title)[:50]
                    project_id = f"{clean_title}_{raw_id}"
                    
                    # Check if already exists to avoid duplicate work (searching by raw_id in existing folders)
                    exists = False
                    if PROJECTS_ROOT.exists():
                        for existing in PROJECTS_ROOT.iterdir():
                            if existing.is_dir() and existing.name.endswith(f"_{raw_id}"):
                                exists = True
                                break
                    if exists:
                        continue

                    p_dir = ensure_project_dirs(project_id)
                    
                    # Save files
                    meta = {
                        "id": entry.id,
                        "title": entry.title,
                        "author": entry.author if hasattr(entry, 'author') else "unknown",
                        "subreddit": sub,
                        "link": entry.link,
                        "published": entry.published if hasattr(entry, 'published') else datetime.now().isoformat(),
                        "textLen": len(text)
                    }
                    
                    (p_dir / "meta.json").write_text(json.dumps(meta, indent=4))
                    (p_dir / "story.txt").write_text(text)
                    
                    harvested.append(project_id)
        except Exception as e:
            errors.append(f"Error harvesting r/{sub}: {str(e)}")
            print(f"--- Error harvesting r/{sub}: {e}", flush=True)

    return {
        "ok": True, 
        "harvested_count": len(harvested), 
        "harvested_projects": harvested,
        "errors": errors
    }

# --- Projects ---
@app.get("/projects")
def list_projects(deps = Depends(auth)):
    if not PROJECTS_ROOT.exists():
        return []
    
    projects = []
    for d in PROJECTS_ROOT.iterdir():
        if d.is_dir():
            title = d.name
            meta_path = d / "meta.json"
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text())
                    title = meta.get("title", title)
                except:
                    pass
            projects.append({"id": d.name, "name": title})
    
    # Sort by creation time (most recent first)
    projects.sort(key=lambda x: (PROJECTS_ROOT / x["id"]).stat().st_mtime, reverse=True)
    return projects

@app.get("/projects/{project_id}")
def get_project(project_id: str, deps = Depends(auth)):
    p = PROJECTS_ROOT / project_id
    if not p.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    data = {"project_id": project_id, "path": str(p)}
    meta_path = p / "meta.json"
    if meta_path.exists():
        try:
            data["meta"] = json.loads(meta_path.read_text())
        except:
            pass
            
    return data

@app.patch("/projects/{project_id}/meta")
def update_project_meta(project_id: str, new_meta: Dict[str, Any], deps = Depends(auth)):
    p = PROJECTS_ROOT / project_id
    if not p.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    meta_path = p / "meta.json"
    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
        except:
            pass
    
    meta.update(new_meta)
    meta_path.write_text(json.dumps(meta, indent=4))
    return {"ok": True, "meta": meta}

# --- Assets ---
@app.get("/assets/backgrounds")
def list_backgrounds(deps = Depends(auth)):
    bg_root = ASSETS_ROOT / "backgrounds"
    if not bg_root.exists(): return []
    return [f.name for f in bg_root.iterdir() if f.is_file()]

# --- Legacy & Processing ---
@app.post("/tts")
async def tts(req: TTSRequest, deps = Depends(auth)):
    p = ensure_project_dirs(req.project_id)
    out = p / "audio/source" / req.output_name
    cmd = [
        "edge-tts", "--voice", req.voice, "--rate", req.rate,
        "--volume", req.volume, "--text", req.text, "--write-media", str(out),
    ]
    run_cmd(cmd)
    return {"ok": True, "path": str(out)}

@app.post("/process")
async def process(job: Job, deps = Depends(auth)):
    loop = asyncio.get_running_loop()
    p = Path(job.project_path).resolve()
    if not str(p).startswith(str(DATA_ROOT)):
        raise HTTPException(status_code=400, detail="Invalid project_path")

    in_audio = p / job.input_audio
    if not in_audio.exists():
        raise HTTPException(status_code=404, detail=f"Input audio not found: {in_audio}")

    audio_wav = p / "audio.wav"
    audio_nosil = p / "audio_nosil.wav"
    audio_clean = p / "audio_clean.wav"
    subtitles = p / "subtitles.srt"

    # Process chain
    await loop.run_in_executor(executor, run_cmd, ["ffmpeg", "-y", "-i", str(in_audio), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(audio_wav)])
    
    dur_wav = audio_duration_seconds(audio_wav)
    transcribe_input = audio_wav
    
    if job.do_preprocess:
        await loop.run_in_executor(executor, reduce_silence_half, audio_wav, audio_nosil, job.silence_threshold_db, job.silence_duration_s)
        transcribe_input = audio_nosil
        
        await loop.run_in_executor(executor, run_cmd, [
            "ffmpeg", "-y", "-i", str(transcribe_input),
            "-af", "highpass=f=80,lowpass=f=8000,acompressor=threshold=-18dB:ratio=3:attack=20:release=250,loudnorm=I=-16:LRA=11:TP=-1.5",
            str(audio_clean)
        ])
        transcribe_input = audio_clean

    if job.do_transcribe:
        model_path = f"/opt/whisper.cpp/models/ggml-{job.model}.bin"
        await loop.run_in_executor(executor, run_cmd, ["whisper", "-m", model_path, "-f", str(transcribe_input), "-l", job.language, "--output-srt"])
        generated = Path(str(transcribe_input) + ".srt")
        if generated.exists():
            shutil.move(str(generated), str(subtitles))

    return {"ok": True, "audio_clean": str(transcribe_input), "subtitles": str(subtitles) if subtitles.exists() else None}

@app.post("/transcribe")
async def transcribe_legacy(job: TranscribeJob, deps = Depends(auth)):
    loop = asyncio.get_running_loop()
    p = Path(job.project_path).resolve()
    in_audio = p / job.input_audio
    model_path = f"/opt/whisper.cpp/models/ggml-{job.model}.bin"
    out_srt = p / job.output_name

    await loop.run_in_executor(executor, run_cmd, ["whisper", "-m", model_path, "-f", str(in_audio), "-l", job.language, "--output-srt"], False)
    
    generated = Path(str(in_audio) + ".srt")
    if generated.exists():
        if out_srt.exists(): out_srt.unlink()
        shutil.move(str(generated), str(out_srt))
        return {"ok": True, "subtitles": str(out_srt)}
    raise HTTPException(status_code=500, detail="SRT not generated")

# --- Jobs ---
@app.get("/jobs/{job_id}")
def get_job(job_id: str, deps = Depends(auth)):
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_db[job_id]

@app.post("/jobs")
async def create_job(payload: Dict[str, Any], background_tasks: BackgroundTasks, deps = Depends(auth)):
    job_id = str(uuid.uuid4())
    jobs_db[job_id] = {"status": "pending", "created_at": datetime.now().isoformat()}
    # Here you would trigger real background processing logic
    return {"job_id": job_id}
