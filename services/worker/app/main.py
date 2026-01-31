import os
import uuid
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Depends, BackgroundTasks, Query, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Local imports
# Local imports
from .database import engine, Base, ProjectModel, AssetModel, AssetCategoryModel, TemplateModel, WorkflowModel, JobModel, SessionLocal, get_db, sync_projects_to_db
from .services.harvester import harvest_from_reddit, HarvesterService
from .services.pipeline import execute_stage, execute_remaining_stages, STAGE_SEQUENCE
from .services.meta_store import update_meta
from .services.log_store import read_logs
from .workflows.registry import get_default_workflows
from .services.template_service import generate_preview_for_project, render_preview_bytes
from .broadcaster import broadcaster

# --- Configuration ---
DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
PROJECTS_ROOT = DATA_ROOT / "projects"
ASSETS_ROOT = DATA_ROOT / "assets"
TOKEN = os.environ.get("WORKER_TOKEN", "")

def _parse_meta_json(meta_json: Optional[str]) -> Dict[str, Any]:
    if not meta_json:
        return {}
    try:
        return json.loads(meta_json)
    except:
        return {}

def _parse_srt_starts(srt_path: Path) -> List[float]:
    if not srt_path.exists():
        return []
    try:
        text = srt_path.read_text(encoding="utf-8")
        blocks = [b for b in text.strip().split("\n\n") if b.strip()]
        starts: List[float] = []
        for block in blocks:
            lines = block.strip().splitlines()
            if len(lines) < 2:
                continue
            time_line = lines[1]
            try:
                start, _ = [s.strip() for s in time_line.split("-->")]
                starts.append(_parse_srt_time(start))
            except:
                continue
        return sorted(set([s for s in starts if s is not None]))
    except:
        return []

def _parse_srt_time(value: str) -> Optional[float]:
    try:
        hh, mm, rest = value.split(":")
        ss, ms = rest.split(",")
        return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000.0
    except:
        return None


async def _get_media_duration(path: Path) -> Optional[float]:
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        if proc.returncode == 0:
            return float(stdout.decode().strip())
    except:
        return None
    return None

def _build_short_segments(starts: List[float], total_duration: float, count: int, segment_length: float) -> List[tuple]:
    segments: List[tuple] = []
    if total_duration <= 0:
        return segments

    if segment_length <= 0:
        segment_length = 60.0

    max_possible = int(total_duration // segment_length) or 1
    target_count = min(count, max_possible)

    cursor = 0.0
    starts_sorted = [s for s in starts if s is not None]
    if not starts_sorted:
        starts_sorted = [0.0]

    idx = 0
    for _ in range(target_count):
        # Move cursor to next subtitle boundary if possible
        while idx < len(starts_sorted) and starts_sorted[idx] < cursor:
            idx += 1
        if idx < len(starts_sorted):
            cursor = starts_sorted[idx]
        if cursor + segment_length > total_duration:
            break
        segments.append((cursor, segment_length))
        cursor += segment_length
    return segments

async def _generate_shorts_task(project_id: str, count: int, segment_length: float):
    project_path = PROJECTS_ROOT / project_id
    final_path = project_path / "video" / "final.mp4"
    if not final_path.exists():
        await broadcaster.broadcast("log", {"level": "error", "message": "Shorts failed: final video not found", "project_id": project_id})
        return

    total_duration = await _get_media_duration(final_path)
    if not total_duration:
        await broadcaster.broadcast("log", {"level": "error", "message": "Shorts failed: unable to read video duration", "project_id": project_id})
        return

    starts = _parse_srt_starts(project_path / "subtitles.srt")
    segments = _build_short_segments(starts, total_duration, count, segment_length)
    if not segments:
        await broadcaster.broadcast("log", {"level": "error", "message": "Shorts failed: no segments to export", "project_id": project_id})
        return

    out_dir = project_path / "video" / "shorts"
    out_dir.mkdir(parents=True, exist_ok=True)
    exported = []

    for idx, (start, length) in enumerate(segments, start=1):
        output_path = out_dir / f"short_{idx:02d}.mp4"
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", f"{start:.2f}",
            "-i", str(final_path),
            "-t", f"{length:.2f}",
            "-vf", "scale=-2:1920,crop=1080:1920",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path)
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await proc.communicate()
            if proc.returncode == 0 and output_path.exists():
                exported.append(output_path.name)
                await broadcaster.broadcast("log", {"level": "success", "message": f"Short created: {output_path.name}", "project_id": project_id})
            else:
                err_msg = stderr.decode(errors="ignore")[-400:]
                await broadcaster.broadcast("log", {"level": "error", "message": f"Shorts export failed: {err_msg}", "project_id": project_id})
        except Exception as e:
            await broadcaster.broadcast("log", {"level": "error", "message": f"Shorts export exception: {e}", "project_id": project_id})

    if exported:
        update_meta(project_id, {"shorts": exported}, project_path)

def sync_workflows_to_db():
    print(">>> SYNC: Starting default workflow synchronization...")
    db = SessionLocal()
    try:
        # 1. Clear ALL existing workflows
        deleted_count = db.query(WorkflowModel).delete()
        print(f">>> SYNC: Deleted {deleted_count} existing workflows.")
        
        # 2. Define workflows
        workflows = get_default_workflows()
        
        # 3. Insert workflows
        for wf in workflows:
            db.add(WorkflowModel(
                id=wf["id"],
                name=wf["name"],
                description=wf["description"],
                nodes_json=json.dumps(wf["nodes"]),
                status=wf["status"],
                usage_count=wf["usage_count"],
                tags_json=json.dumps(wf["tags"])
            ))
        db.commit()
        print(f">>> SYNC: Successfully seeded workflows: {[w['name'] for w in workflows]}")
    except Exception as e:
        print(f">>> SYNC: CRITICAL ERROR: {e}")
        db.rollback()
    finally:
        db.close()
        print(">>> SYNC: Sync process finished.")

def _parse_schedule_time(schedule_time: Optional[str]) -> Optional[tuple]:
    if not schedule_time:
        return None
    try:
        parts = schedule_time.split(":")
        if len(parts) < 2:
            return None
        hour = int(parts[0])
        minute = int(parts[1])
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            return None
        return hour, minute
    except Exception:
        return None

def _time_reached(now: datetime, schedule_hm: tuple) -> bool:
    sched_h, sched_m = schedule_hm
    return now.hour > sched_h or (now.hour == sched_h and now.minute >= sched_m)

def _schedule_datetime_for_day(day: datetime, schedule_hm: tuple) -> datetime:
    sched_h, sched_m = schedule_hm
    return day.replace(hour=sched_h, minute=sched_m, second=0, microsecond=0)

def _should_run_job(job: JobModel, now: datetime) -> bool:
    if job.status == "Running":
        return False

    interval = (job.schedule_interval or "once").lower()
    schedule_hm = _parse_schedule_time(job.schedule_time)

    if interval == "once":
        if job.status != "Pending":
            return False
        if job.last_run:
            return False
        if schedule_hm and not _time_reached(now, schedule_hm):
            return False
        return True

    if not schedule_hm:
        return False

    if interval == "daily":
        schedule_today = _schedule_datetime_for_day(now, schedule_hm)
        if job.last_run and job.last_run >= schedule_today:
            return False
        return now >= schedule_today

    if interval == "weekly":
        if job.created_at and job.created_at.weekday() != now.weekday():
            return False
        schedule_today = _schedule_datetime_for_day(now, schedule_hm)
        if job.last_run and job.last_run >= schedule_today:
            return False
        return now >= schedule_today

    return False

async def scheduler_loop():
    print(">>> SCHEDULER: Starting periodic check loop...")
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            
            jobs = db.query(JobModel).all()
            
            for job in jobs:
                if _should_run_job(job, now):
                    print(f">>> SCHEDULER: Triggering job {job.id} ({job.schedule_interval})")
                    asyncio.create_task(execute_job_task(job.id))
            
            db.close()
        except Exception as e:
            print(f">>> SCHEDULER: Loop error: {e}")
            
        await asyncio.sleep(60) # Check every minute

@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_projects_to_db()
    sync_assets_to_db()
    sync_workflows_to_db()
    
    # Start scheduler
    scheduler_task = asyncio.create_task(scheduler_loop())
    
    yield
    
    # Cleanup scheduler
    scheduler_task.cancel()
    try: await scheduler_task
    except asyncio.CancelledError: pass

app = FastAPI(title="FrameForge Worker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files ---
app.mount("/assets_static", StaticFiles(directory=ASSETS_ROOT), name="assets")

# --- Models ---
class WorkflowSchema(BaseModel):
    id: str
    name: str
    description: str
    nodes: List[Dict[str, Any]]
    status: str = "active"
    usageCount: int = 0
    tags: List[str] = []

class JobCreate(BaseModel):
    workflowId: str
    parameters: Dict[str, Any]
    schedule_interval: Optional[str] = "once"
    schedule_time: Optional[str] = None

class JobUpdate(BaseModel):
    parameters: Optional[Dict[str, Any]] = None
    schedule_interval: Optional[str] = None
    schedule_time: Optional[str] = None

class JobSchema(BaseModel):
    id: str
    workflowId: str
    projectId: Optional[str]
    status: str
    progress: int
    parameters: Dict[str, Any]
    schedule_interval: str
    schedule_time: Optional[str]
    last_run: Optional[datetime]
    createdAt: datetime

class Job(BaseModel):
    project_path: str
    input_audio: str
    language: str = "es"
    model: str = "small"
    do_preprocess: bool = True
    do_transcribe: bool = False

class TTSRequest(BaseModel):
    project_id: str
    text: str
    voice: str = "es-ES-AlvaroNeural"
    rate: str = "+0%"
    volume: str = "+0%"
    output_name: str = "voice.mp3"

def auth(x_worker_token: str = Header(default=""), token: str = Query(default="")):
    """Auth that accepts token from header or query parameter (for media files)"""
    actual_token = x_worker_token or token
    if TOKEN and actual_token != TOKEN:
        raise HTTPException(status_code=401, detail="Bad token")

# --- Endpoints ---
@app.get("/health")
def health():
    return {"ok": True, "timestamp": datetime.now().isoformat()}

@app.get("/config/global")
def get_config_global(deps = Depends(auth)):
    config_path = DATA_ROOT / "config_global.json"
    defaults = {
        "SUBREDDITS": ["scarystories", "nosleep", "shortstories"],
        "REDDIT_LIMIT": 25,
        "MIN_CHARS": 600,
        "MAX_CHARS": 12000,
        "N8N_WEBHOOK_URL": os.environ.get("N8N_WEBHOOK_URL", "")
    }
    if config_path.exists():
        try:
            defaults.update(json.loads(config_path.read_text()))
        except: pass
    return defaults

@app.put("/config/global")
def update_config_global(config: Dict[str, Any], deps = Depends(auth)):
    config_path = DATA_ROOT / "config_global.json"
    try:
        config_path.write_text(json.dumps(config, indent=4))
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {e}")

@app.get("/events")
async def events_endpoint(deps = Depends(auth)):
    async def event_generator():
        queue = await broadcaster.connect()
        try:
            while True:
                data = await queue.get()
                yield data
        except asyncio.CancelledError:
            broadcaster.disconnect(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/logs")
def get_logs(
    limit: int = Query(500, ge=1, le=5000),
    project_id: Optional[str] = Query(None),
    deps = Depends(auth)
):
    return read_logs(limit=limit, project_id=project_id)

@app.post("/trigger-n8n")
async def trigger_n8n(deps = Depends(auth)):
    config = get_config_global(deps)
    webhook_url = config.get("N8N_WEBHOOK_URL", "")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="n8n Webhook URL not configured")

    internal_url = webhook_url.replace("localhost", "n8n").replace("127.0.0.1", "n8n")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(internal_url, json={"trigger": "dashboard"})
            if resp.status_code < 400: return {"ok": True, "n8n_response": resp.text}
        except: pass
        
        try:
            resp = await client.post(webhook_url, json={"trigger": "dashboard"})
            if resp.status_code < 400: return {"ok": True, "n8n_response": resp.text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"n8n trigger failed: {str(e)}")

@app.post("/projects/harvest")
def harvest_projects(db: Session = Depends(get_db), deps = Depends(auth)):
    config = get_config_global(deps)
    harvested = harvest_from_reddit(db, config)
    return {"status": "ok", "harvested_count": len(harvested), "projects": harvested}

@app.get("/projects")
def list_projects(db: Session = Depends(get_db), deps = Depends(auth)):
    results = db.query(ProjectModel).order_by(ProjectModel.updated_at.desc()).all()
    return [{
        "id": p.id, 
        "name": p.title, 
        "category": p.subreddit,
        "status": p.status,
        "currentStage": p.current_stage,
        "duration": _parse_meta_json(p.meta_json).get("duration"),
        "thumbnail": _parse_meta_json(p.meta_json).get("thumbnail")
    } for p in results]

@app.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    p_path = PROJECTS_ROOT / project_id

    data = {
        "project_id": project_id,
        "meta": {
            "title": project.title,
            "author": project.author,
            "status": project.status,
            "currentStage": project.current_stage,
            "subreddit": project.subreddit,
            "updatedAt": project.updated_at.isoformat()
        }
    }
    meta_json = _parse_meta_json(project.meta_json)
    if meta_json:
        if (not project.title or project.title.lower() == "project" or project.title == project_id) and meta_json.get("title"):
            data["meta"]["title"] = meta_json.get("title")
        if (not project.author) and meta_json.get("author"):
            data["meta"]["author"] = meta_json.get("author")
    data["meta"].update({k: v for k, v in meta_json.items() if k not in data["meta"]})
    
    # Read content
    story_path = p_path / "text/story_translated.txt"
    if not story_path.exists(): story_path = p_path / "text/story.txt"
    if story_path.exists():
        data["content"] = story_path.read_text(encoding="utf-8", errors="replace")
    
    return data

@app.patch("/projects/{project_id}/meta")
def update_project_meta(project_id: str, new_meta: Dict[str, Any], db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    if "title" in new_meta: project.title = new_meta["title"]
    if "author" in new_meta: project.author = new_meta["author"]
    if "status" in new_meta: project.status = new_meta["status"]
    if "currentStage" in new_meta: project.current_stage = new_meta["currentStage"]
    existing_meta = _parse_meta_json(project.meta_json)
    existing_meta.update(new_meta)
    project.meta_json = json.dumps(existing_meta)
    db.commit()
    return {"status": "ok"}

@app.post("/projects/{project_id}/preview")
def generate_project_preview(
    project_id: str,
    type: str = Query(..., pattern="^(intro|outro)$"),
    db: Session = Depends(get_db),
    deps = Depends(auth)
):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    generate_preview_for_project(project, db, project_id, type)
    output_path = PROJECTS_ROOT / project_id / "video" / "parts" / f"{type}_preview.png"
    if not output_path.exists():
        raise HTTPException(status_code=500, detail="Preview not generated")
    return {"status": "ok", "path": str(output_path.relative_to(PROJECTS_ROOT / project_id))}

@app.delete("/projects/{project_id}")
def delete_project(project_id: str, complete: bool = False, db: Session = Depends(get_db), deps = Depends(auth)):
    """
    Delete or cancel a project.
    - complete=true: Delete folder and database row
    - complete=false: Mark as Cancelled in database, keep folder
    """
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    if complete:
        # Complete deletion: remove folder and DB row
        p_path = PROJECTS_ROOT / project_id
        if p_path.exists():
            import shutil
            shutil.rmtree(p_path)
        
        db.delete(project)
        db.commit()
        return {"status": "deleted", "complete": True}
    else:
        # Cancel: mark as cancelled, keep folder
        project.status = "Cancelled"
        project.current_stage = "Cancelled"
        db.commit()
        
        update_meta(project_id, {"status": "Cancelled", "currentStage": "Cancelled"}, PROJECTS_ROOT / project_id)
        
        return {"status": "cancelled", "complete": False}

@app.post("/projects/{project_id}/run-next-stage")
async def run_stage(project_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    current = project.current_stage
    try: idx = STAGE_SEQUENCE.index(current)
    except: idx = -1
    
    if idx + 1 >= len(STAGE_SEQUENCE):
        return {"status": "completed"}
        
    next_stage = STAGE_SEQUENCE[idx + 1]
    project.status = "Processing"
    db.commit()
    
    background_tasks.add_task(execute_stage, project_id, next_stage)
    return {"status": "started", "stage": next_stage}

@app.post("/projects/{project_id}/export")
async def export_final(project_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Clear previous export artifacts but keep previews/overlays
    p = PROJECTS_ROOT / project_id
    parts_dir = p / "video" / "parts"
    if parts_dir.exists():
        for file in parts_dir.iterdir():
            if not file.is_file():
                continue
            name = file.name.lower()
            if name.endswith("_preview.png") or name.endswith("_overlay.png"):
                continue
            if name.startswith("main_background") or name.startswith("final_video"):
                file.unlink(missing_ok=True)
                continue
            if name.startswith("bg_seg_") or name in ("bg_concat.txt", "final_concat.txt", "subtitles_shifted.srt"):
                file.unlink(missing_ok=True)
                continue
            if name in ("intro_segment.mp4", "outro_segment.mp4", "intro_voice.mp3", "outro_voice.mp3"):
                file.unlink(missing_ok=True)
                continue
    final_path = p / "video" / "final.mp4"
    if final_path.exists():
        try:
            final_path.unlink()
        except:
            pass

    # Regenerate previews/overlays if needed before export
    generate_preview_for_project(project, db, project_id, "intro")
    generate_preview_for_project(project, db, project_id, "outro")

    project.status = "Processing"
    project.current_stage = "Master Composition"
    db.commit()

    update_meta(project_id, {"status": "Processing", "currentStage": "Master Composition"}, PROJECTS_ROOT / project_id)
    await broadcaster.broadcast("status_update", {"id": project_id, "status": "Processing", "currentStage": "Master Composition"})
    background_tasks.add_task(execute_stage, project_id, "Master Composition")
    return {"status": "started", "stage": "Master Composition"}

@app.post("/projects/{project_id}/retry-stage")
async def retry_stage(project_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project: raise HTTPException(status_code=404, detail="Project not found")
    
    # Identify what stage to retry. 
    # If currently in Scrapped, next is Translated. 
    # If Translated, next is Generated. 
    # We use the same STAGE_SEQUENCE logic but specifically for the "next" relative to where it stopped.
    
    current = project.current_stage
    try: idx = STAGE_SEQUENCE.index(current)
    except: idx = -1
    
    if idx + 1 >= len(STAGE_SEQUENCE):
        return {"status": "completed"}
        
    next_stage = STAGE_SEQUENCE[idx + 1]
    project.status = "Processing"
    db.commit()
    
    background_tasks.add_task(execute_stage, project_id, next_stage)
    return {"status": "retrying", "stage": next_stage}

@app.post("/projects/{project_id}/run-automatically")
async def run_automatically(project_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        idx = STAGE_SEQUENCE.index(project.current_stage)
    except:
        idx = -1
    stages = STAGE_SEQUENCE[idx + 1:]
    if "Master Composition" in stages:
        stages = stages[:stages.index("Master Composition")]
    if not stages:
        return {"status": "ready_for_master"}

    project.status = "Processing"
    db.commit()

    update_meta(project_id, {"status": "Processing"}, PROJECTS_ROOT / project_id)

    await broadcaster.broadcast("status_update", {"id": project_id, "status": "Processing", "currentStage": project.current_stage})
    background_tasks.add_task(execute_remaining_stages, project_id)
    return {"status": "started"}

@app.post("/projects/{project_id}/cleanup")
def cleanup_project(project_id: str, deps = Depends(auth)):
    """Delete generated files (audio, video) but keep text files"""
    p = PROJECTS_ROOT / project_id
    if not p.exists(): 
        raise HTTPException(status_code=404, detail="Project not found")
    
    deleted_files = []
    
    # Delete audio folders
    audio_source = p / "audio" / "source"
    audio_clean = p / "audio" / "clean"
    
    if audio_source.exists():
        for file in audio_source.iterdir():
            if file.is_file():
                file.unlink()
                deleted_files.append(str(file.relative_to(p)))
    
    if audio_clean.exists():
        for file in audio_clean.iterdir():
            if file.is_file():
                file.unlink()
                deleted_files.append(str(file.relative_to(p)))
    
    # Delete video folder
    video_parts = p / "video" / "parts"
    if video_parts.exists():
        for file in video_parts.iterdir():
            if file.is_file():
                file.unlink()
                deleted_files.append(str(file.relative_to(p)))
    
    # Delete subtitles
    subtitles = p / "subtitles.srt"
    if subtitles.exists():
        subtitles.unlink()
        deleted_files.append("subtitles.srt")
    
    return {
        "status": "ok",
        "deleted_count": len(deleted_files),
        "deleted_files": deleted_files
    }

    return {
        "status": "ok",
        "deleted_count": len(deleted_files),
        "deleted_files": deleted_files
    }

def sync_assets_to_db():
    print("Syncing assets to database...")
    db = SessionLocal()
    try:
        if not ASSETS_ROOT.exists():
            ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
            return
            
        default_categories = ["backgrounds", "intros", "endings", "music", "sfx", "templates", "uncategorized"]
        for cat in default_categories:
            if not db.query(AssetCategoryModel).filter(AssetCategoryModel.id == cat).first():
                db.add(AssetCategoryModel(id=cat))
        db.commit()

        for root, _, filenames in os.walk(ASSETS_ROOT):
            for f in filenames:
                f_path = Path(root) / f
                rel_path = f_path.relative_to(ASSETS_ROOT)
                clean_path = str(rel_path).replace("\\", "/")
                
                existing = db.query(AssetModel).filter(AssetModel.id == clean_path).first()
                category = rel_path.parts[0] if len(rel_path.parts) > 1 else "uncategorized"
                if not db.query(AssetCategoryModel).filter(AssetCategoryModel.id == category).first():
                    db.add(AssetCategoryModel(id=category))
                if not existing:
                    # Determine initial category from physical folder
                    new_asset = AssetModel(
                        id=clean_path,
                        name=f,
                        categories=json.dumps([category]),
                        size=str(f_path.stat().st_size),
                        file_type=f_path.suffix.lower(),
                        url=f"/assets_static/{clean_path}"
                    )
                    db.add(new_asset)
                else:
                    cats = json.loads(existing.categories or "[]")
                    if category not in cats:
                        cats.append(category)
                        existing.categories = json.dumps(cats)
                    if existing.name != f:
                        existing.name = f
                    size_value = str(f_path.stat().st_size)
                    if existing.size != size_value:
                        existing.size = size_value
                    file_type_value = f_path.suffix.lower()
                    if existing.file_type != file_type_value:
                        existing.file_type = file_type_value
                    url_value = f"/assets_static/{clean_path}"
                    if existing.url != url_value:
                        existing.url = url_value
        db.commit()
        print("Asset sync complete.")
    except Exception as e:
        print(f"Asset sync error: {e}")
    finally:
        db.close()

class AssetCategoryRequest(BaseModel):
    id: str

class TemplateFieldSchema(BaseModel):
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    font: str
    size: int
    color: str
    shadow: str
    align: str
    preview: Optional[bool] = True
    autoFit: Optional[bool] = False
    strokeWidth: Optional[int] = 0
    strokeColor: Optional[str] = "#000000"

class TemplateCreateRequest(BaseModel):
    name: str
    image_path: str
    fields: List[TemplateFieldSchema]

class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    image_path: Optional[str] = None
    fields: Optional[List[TemplateFieldSchema]] = None

class TemplatePreviewRequest(BaseModel):
    template_id: Optional[str] = None
    image_path: Optional[str] = None
    fields: Optional[List[TemplateFieldSchema]] = None
    field_values: Optional[Dict[str, str]] = None
    preview_aspect: Optional[str] = "16:9"

@app.get("/assets")
def list_assets(db: Session = Depends(get_db), deps = Depends(auth)):
    results = db.query(AssetModel).all()
    assets = []
    for p in results:
        assets.append({
            "name": p.name,
            "path": p.id,
            "categories": json.loads(p.categories or "[]"),
            "size": int(p.size or 0),
            "created_at": p.created_at.isoformat(),
            "type": p.file_type,
            "url": p.url
        })
    return assets

@app.get("/asset-categories")
def list_asset_categories(db: Session = Depends(get_db), deps = Depends(auth)):
    results = db.query(AssetCategoryModel).order_by(AssetCategoryModel.id.asc()).all()
    return [c.id for c in results]

@app.post("/asset-categories")
def create_asset_category(body: AssetCategoryRequest, db: Session = Depends(get_db), deps = Depends(auth)):
    raw = body.id or ""
    clean = "".join([c for c in raw if c.isalnum() or c in "-_"]).lower()
    if not clean:
        raise HTTPException(status_code=400, detail="Invalid category")
    existing = db.query(AssetCategoryModel).filter(AssetCategoryModel.id == clean).first()
    if existing:
        return {"status": "exists", "id": clean}
    db.add(AssetCategoryModel(id=clean))
    db.commit()
    return {"status": "created", "id": clean}

@app.get("/templates")
def list_templates(db: Session = Depends(get_db), deps = Depends(auth)):
    results = db.query(TemplateModel).order_by(TemplateModel.created_at.desc()).all()
    return [{
        "id": t.id,
        "name": t.name,
        "image_path": t.image_path,
        "fields": json.loads(t.fields_json or "[]"),
        "created_at": t.created_at.isoformat()
    } for t in results]

@app.post("/templates")
def create_template(body: TemplateCreateRequest, db: Session = Depends(get_db), deps = Depends(auth)):
    template_id = f"tpl_{uuid.uuid4().hex[:8]}"
    new_tpl = TemplateModel(
        id=template_id,
        name=body.name,
        image_path=body.image_path,
        fields_json=json.dumps([f.dict() for f in body.fields])
    )
    db.add(new_tpl)
    db.commit()
    return {"id": template_id, "status": "created"}

@app.get("/templates/{template_id}")
def get_template(template_id: str, db: Session = Depends(get_db), deps = Depends(auth)):
    tpl = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "id": tpl.id,
        "name": tpl.name,
        "image_path": tpl.image_path,
        "fields": json.loads(tpl.fields_json or "[]"),
        "created_at": tpl.created_at.isoformat()
    }

@app.patch("/templates/{template_id}")
def update_template(template_id: str, body: TemplateUpdateRequest, db: Session = Depends(get_db), deps = Depends(auth)):
    tpl = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if body.name is not None:
        tpl.name = body.name
    if body.image_path is not None:
        tpl.image_path = body.image_path
    if body.fields is not None:
        tpl.fields_json = json.dumps([f.dict() for f in body.fields])
    db.commit()
    return {"status": "updated", "id": tpl.id}

@app.post("/templates/preview")
def render_template_preview_endpoint(body: TemplatePreviewRequest, db: Session = Depends(get_db), deps = Depends(auth)):
    template = None
    if body.template_id:
        template = db.query(TemplateModel).filter(TemplateModel.id == body.template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

    image_path = body.image_path or (template.image_path if template else None)
    if not image_path:
        raise HTTPException(status_code=400, detail="image_path is required")

    fields = body.fields
    if fields is None:
        if not template:
            raise HTTPException(status_code=400, detail="fields are required")
        fields = json.loads(template.fields_json or "[]")

    preview_aspect = body.preview_aspect or "16:9"
    field_values = body.field_values or {}
    data = render_preview_bytes(image_path, fields, field_values, preview_aspect)
    return Response(content=data, media_type="image/png")

@app.post("/assets")
async def upload_asset(
    file: UploadFile = File(...), 
    category: str = Form("uncategorized"),
    db: Session = Depends(get_db),
    deps = Depends(auth)
):
    if not ASSETS_ROOT.exists(): ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
    
    # Sanitize category
    category = "".join([c for c in category if c.isalnum() or c in "-_"]).lower()
    if not category: category = "uncategorized"

    if not db.query(AssetCategoryModel).filter(AssetCategoryModel.id == category).first():
        db.add(AssetCategoryModel(id=category))
    
    save_dir = ASSETS_ROOT / category
    save_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = save_dir / file.filename
    clean_path = f"{category}/{file.filename}"
    
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
                
        # Save to DB
        existing = db.query(AssetModel).filter(AssetModel.id == clean_path).first()
        if existing:
            cats = json.loads(existing.categories or "[]")
            if category not in cats:
                cats.append(category)
                existing.categories = json.dumps(cats)
        else:
            new_asset = AssetModel(
                id=clean_path,
                name=file.filename,
                categories=json.dumps([category]),
                size=str(len(content)),
                file_type=Path(file.filename).suffix.lower(),
                url=f"/assets_static/{clean_path}"
            )
            db.add(new_asset)
        
        db.commit()
        
        return {
            "status": "ok", 
            "filename": file.filename, 
            "categories": [category],
            "path": clean_path,
            "url": f"/assets_static/{clean_path}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
        
# --- Workflow Endpoints ---
@app.get("/workflows")
def list_workflows(db: Session = Depends(get_db), deps = Depends(auth)):
    results = db.query(WorkflowModel).all()
    return [{
        "id": w.id,
        "name": w.name,
        "description": w.description,
        "nodes": json.loads(w.nodes_json) if w.nodes_json else [],
        "status": w.status,
        "usageCount": w.usage_count or 0,
        "tags": json.loads(w.tags_json) if w.tags_json else []
    } for w in results]

@app.post("/workflows")
def create_workflow(wf: WorkflowSchema, db: Session = Depends(get_db), deps = Depends(auth)):
    new_wf = WorkflowModel(
        id=wf.id,
        name=wf.name,
        description=wf.description,
        nodes_json=json.dumps(wf.nodes),
        status=wf.status,
        usage_count=wf.usageCount,
        tags_json=json.dumps(wf.tags)
    )
    db.add(new_wf)
    db.commit()
    return {"status": "ok"}

@app.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db), deps = Depends(auth)):
    wf = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    db.delete(wf)
    db.commit()
    return {"status": "deleted"}

# --- Job Endpoints ---
@app.get("/jobs")
def list_jobs(db: Session = Depends(get_db), deps = Depends(auth)):
    results = db.query(JobModel).order_by(JobModel.created_at.desc()).all()
    return [{
        "id": j.id,
        "workflowId": j.workflow_id,
        "projectId": j.project_id,
        "status": j.status,
        "progress": j.progress,
        "parameters": json.loads(j.parameters_json) if j.parameters_json else {},
        "schedule_interval": j.schedule_interval or "once",
        "schedule_time": j.schedule_time,
        "last_run": j.last_run.isoformat() if j.last_run else None,
        "createdAt": j.created_at.isoformat()
    } for j in results]

async def execute_job_task(job_id: str):
    print(f">>> JOB: Starting execution for {job_id}")
    db = SessionLocal()
    try:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job: 
            print(f">>> JOB: Job {job_id} not found")
            return
            
        job.status = "Running"
        job.progress = 10
        db.commit()
        await broadcaster.broadcast("status_update", {"id": job_id, "status": "Running", "type": "job"})
        
        params = json.loads(job.parameters_json)
        
        # 1. Scraping Layer (Harvester)
        # Adapt params to what harvester expects
        config = {
            "SUBREDDITS": params.get("subreddits", ["AskReddit"]),
            "REDDIT_LIMIT": params.get("posts_per_subreddit", 3),
            "MIN_CHARS": params.get("minChars", 500),
            "MAX_CHARS": params.get("maxChars", 4000),
            "REDDIT_SORT": params.get("sort", "top"),
            "REDDIT_TIMEFRAME": params.get("timeframe", "day")
        }
        
        harvester = HarvesterService(db)
        harvested_projects = harvester.harvest(config)
        job.progress = 50
        db.commit()

        asset_folder = params.get("asset_folder", "backgrounds")
        output_format = params.get("output_format", "mp4")
        caption_mode = params.get("caption_mode", "line")
        aspect_ratio = params.get("aspect_ratio", "horizontal")
        output_resolution = params.get("output_resolution", "4k_30")
        bgm_enabled = params.get("bgm_enabled", True)
        bgm_volume = params.get("bgm_volume", 75)
        background_mode = params.get("background_mode", "category")
        background_video = params.get("background_video", "")
        background_segment_minutes = params.get("background_segment_minutes", 2)
        background_strategy = params.get("background_strategy", "random")
        background_transition = params.get("background_transition", "dissolve")
        thumbnail = params.get("thumbnail", "")

        def build_intro_outro_config(prefix: str) -> Optional[Dict[str, Any]]:
            mode = params.get(f"{prefix}_mode", "compose")
            template_id = params.get(f"{prefix}_template_id", "")
            video = params.get(f"{prefix}_video", "")
            text = params.get(f"{prefix}_text", "")
            voice = params.get(f"{prefix}_voice", "same")
            preview_aspect = params.get(f"{prefix}_preview_aspect", "16:9")
            template_fields = params.get(f"{prefix}_template_fields", {}) or {}
            if mode == "none":
                return None
            if mode == "video" and not video:
                return None
            if mode == "compose" and not (template_id or text):
                return None
            return {
                "mode": mode,
                "video": video,
                "text": text,
                "voice": voice,
                "templateId": template_id,
                "templateFields": template_fields,
                "previewAspect": preview_aspect
            }
        intro_config = build_intro_outro_config("intro")
        outro_config = build_intro_outro_config("outro")
        global_voice_style = params.get("global_voice_style")
        global_language = params.get("global_language")
        global_gender = params.get("global_gender")
        for project_id in harvested_projects:
            payload = {
                "asset_folder": asset_folder,
                "output_format": output_format,
                "caption_mode": caption_mode,
                "aspect_ratio": aspect_ratio,
                "output_resolution": output_resolution,
                "bgm_enabled": bgm_enabled,
                "bgm_volume": bgm_volume,
                "background_mode": background_mode,
                "background_video": background_video,
                "background_segment_minutes": background_segment_minutes,
                "background_strategy": background_strategy,
                "background_transition": background_transition
            }
            if global_voice_style:
                payload["global_voice_style"] = global_voice_style
            if global_language:
                payload["global_language"] = global_language
            if global_gender:
                payload["global_gender"] = global_gender
            if thumbnail:
                payload["thumbnail"] = thumbnail
            if intro_config:
                payload["intro_config"] = intro_config
            if outro_config:
                payload["outro_config"] = outro_config
            update_meta(project_id, payload, PROJECTS_ROOT / project_id)
        
        # 2. Trigger processing for each project
        # In a real scenario, we might want to start them one by one or in parallel
        # For now, we just ensure they are created and "Success" (Scrapped)
        # The user said: "when it runs, it should generate projects"
        
        job.status = "Completed"
        job.progress = 100
        job.last_run = datetime.utcnow()
        db.commit()
        await broadcaster.broadcast("status_update", {"id": job_id, "status": "Completed", "type": "job"})
        print(f">>> JOB: Completed {job_id}. Harvested {len(harvested_projects)} projects.")
        
    except Exception as e:
        print(f">>> JOB: Error executing {job_id}: {e}")
        if job:
            job.status = "Failed"
            db.commit()
            await broadcaster.broadcast("status_update", {"id": job_id, "status": "Failed", "type": "job"})
    finally:
        db.close()

@app.post("/jobs")
def create_job(job_data: JobCreate, db: Session = Depends(get_db), deps = Depends(auth)):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    
    # 1. Update Workflow Usage
    wf = db.query(WorkflowModel).filter(WorkflowModel.id == job_data.workflowId).first()
    if wf:
        wf.usage_count = (wf.usage_count or 0) + 1
    
    schedule_interval = (job_data.schedule_interval or "once").lower()
    schedule_time = job_data.schedule_time or None

    # 2. Create Job in DB
    new_job = JobModel(
        id=job_id,
        workflow_id=job_data.workflowId,
        project_id=None,
        status="Pending",
        progress=0,
        parameters_json=json.dumps(job_data.parameters),
        schedule_interval=schedule_interval,
        schedule_time=schedule_time
    )
    db.add(new_job)
    db.commit()
        
    return {"id": job_id}

@app.delete("/jobs/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), deps = Depends(auth)):
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    return {"status": "ok"}

@app.patch("/jobs/{job_id}")
def update_job(job_id: str, body: JobUpdate, db: Session = Depends(get_db), deps = Depends(auth)):
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if body.schedule_interval is not None:
        interval = body.schedule_interval.lower()
        if interval not in ["once", "daily", "weekly"]:
            raise HTTPException(status_code=400, detail="Invalid schedule_interval")
        job.schedule_interval = interval

    if body.schedule_time is not None:
        if body.schedule_time == "":
            job.schedule_time = None
        else:
            if _parse_schedule_time(body.schedule_time) is None:
                raise HTTPException(status_code=400, detail="Invalid schedule_time")
            job.schedule_time = body.schedule_time

    if job.schedule_interval in ["daily", "weekly"] and not job.schedule_time:
        raise HTTPException(status_code=400, detail="schedule_time is required for daily/weekly schedules")

    if body.parameters is not None:
        job.parameters_json = json.dumps(body.parameters)

    db.commit()
    return {"status": "ok"}

@app.post("/jobs/{job_id}/run")
async def run_job(job_id: str, db: Session = Depends(get_db), deps = Depends(auth)):
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "Running":
        raise HTTPException(status_code=409, detail="Job already running")

    job.status = "Pending"
    job.progress = 0
    db.commit()

    asyncio.create_task(execute_job_task(job_id))
    return {"status": "started"}

class UpdateCategoriesRequest(BaseModel):
    categories: List[str]

class ShortsRequest(BaseModel):
    count: Optional[int] = 3
    segment_length: Optional[float] = 60.0

@app.patch("/assets/{category}/{filename}")
def update_asset_categories(category: str, filename: str, body: UpdateCategoriesRequest, db: Session = Depends(get_db), deps = Depends(auth)):
    clean_path = f"{category}/{filename}"
    asset = db.query(AssetModel).filter(AssetModel.id == clean_path).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    asset.categories = json.dumps(body.categories)
    for cat in body.categories:
        if not db.query(AssetCategoryModel).filter(AssetCategoryModel.id == cat).first():
            db.add(AssetCategoryModel(id=cat))
    db.commit()
    
    return {
        "status": "updated", 
        "filename": filename, 
        "categories": body.categories
    }

@app.delete("/assets/{category}/{filename}")
def delete_asset(category: str, filename: str, db: Session = Depends(get_db), deps = Depends(auth)):
    file_path = (ASSETS_ROOT / category / filename).resolve()
    clean_path = f"{category}/{filename}"
    
    if not str(file_path).startswith(str(ASSETS_ROOT)):
        raise HTTPException(status_code=403, detail="Access denied")
        
    try:
        if file_path.exists():
            file_path.unlink()
        
        asset = db.query(AssetModel).filter(AssetModel.id == clean_path).first()
        if asset:
            db.delete(asset)
            db.commit()
            
        return {"status": "deleted", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {e}")

@app.post("/projects/{project_id}/shorts")
async def create_project_shorts(project_id: str, body: ShortsRequest, db: Session = Depends(get_db), deps = Depends(auth)):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    count = body.count or 3
    segment_length = body.segment_length or 60.0
    asyncio.create_task(_generate_shorts_task(project_id, count, segment_length))
    return {"status": "started", "count": count, "segment_length": segment_length}

@app.get("/projects/{project_id}/files")
def list_files(project_id: str, deps = Depends(auth)):
    p = PROJECTS_ROOT / project_id
    if not p.exists(): raise HTTPException(status_code=404)
    files = []
    for root, _, filenames in os.walk(p):
        for f in filenames:
            rel = os.path.relpath(os.path.join(root, f), p).replace("\\", "/")
            files.append({"path": rel, "size": os.path.getsize(os.path.join(root, f))})
    return files

@app.get("/projects/{project_id}/files/content")
def get_file(project_id: str, path: str, deps = Depends(auth)):
    f_path = (PROJECTS_ROOT / project_id / path).resolve()
    if not str(f_path).startswith(str(PROJECTS_ROOT)): raise HTTPException(status_code=403)
    if not f_path.exists(): raise HTTPException(status_code=404)
    
    # Detect file type by extension
    ext = f_path.suffix.lower()
    
    # Binary file types that should be served directly
    binary_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    
    if ext in binary_types:
        return FileResponse(
            path=str(f_path),
            media_type=binary_types[ext],
            filename=f_path.name
        )
    
    # Text files - return as JSON
    return {"content": f_path.read_text(encoding="utf-8", errors="replace")}

