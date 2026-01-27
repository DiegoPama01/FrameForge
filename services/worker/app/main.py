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
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Local imports
from .database import engine, Base, ProjectModel, SessionLocal, get_db, sync_projects_to_db
from .services.harvester import harvest_from_reddit
from .services.pipeline import execute_stage, STAGE_SEQUENCE
from .broadcaster import broadcaster

# --- Configuration ---
DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
PROJECTS_ROOT = DATA_ROOT / "projects"
ASSETS_ROOT = DATA_ROOT / "assets"
TOKEN = os.environ.get("WORKER_TOKEN", "")

@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_projects_to_db()
    yield

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
        "currentStage": p.current_stage
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
            "status": project.status,
            "currentStage": project.current_stage,
            "subreddit": project.subreddit,
            "updatedAt": project.updated_at.isoformat()
        }
    }
    
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
    if "status" in new_meta: project.status = new_meta["status"]
    if "currentStage" in new_meta: project.current_stage = new_meta["currentStage"]
    db.commit()
    
    # Sync filesystem
    meta_path = PROJECTS_ROOT / project_id / "meta.json"
    if meta_path.exists():
        try:
            m = json.loads(meta_path.read_text()); m.update(new_meta)
            meta_path.write_text(json.dumps(m, indent=4))
        except: pass
    return {"status": "ok"}

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
        
        # Update filesystem metadata
        meta_path = PROJECTS_ROOT / project_id / "meta.json"
        if meta_path.exists():
            try:
                m = json.loads(meta_path.read_text())
                m["status"] = "Cancelled"
                m["currentStage"] = "Cancelled"
                meta_path.write_text(json.dumps(m, indent=4))
            except: pass
        
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

@app.get("/assets")
def list_assets(deps = Depends(auth)):
    if not ASSETS_ROOT.exists(): ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
    assets = []
    
    # Predefined categories
    categories = ["backgrounds", "intros", "endings", "music", "sfx"]
    for cat in categories:
        (ASSETS_ROOT / cat).mkdir(exist_ok=True)

    for root, dirnames, filenames in os.walk(ASSETS_ROOT):
        for f in filenames:
            f_path = Path(root) / f
            rel_path = f_path.relative_to(ASSETS_ROOT)
            
            # Determine category from folder
            category = rel_path.parts[0] if len(rel_path.parts) > 1 else "uncategorized"
            
            clean_path = str(rel_path).replace("\\", "/")
            assets.append({
                "name": f,
                "path": clean_path,
                "category": category,
                "size": f_path.stat().st_size,
                "created_at": datetime.fromtimestamp(f_path.stat().st_ctime).isoformat(),
                "type": f_path.suffix.lower(),
                "url": f"/assets_static/{clean_path}"
            })
            
    return assets

@app.post("/assets")
async def upload_asset(
    file: UploadFile = File(...), 
    category: str = Form("uncategorized"),
    deps = Depends(auth)
):
    if not ASSETS_ROOT.exists(): ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
    
    # Sanitize category
    category = "".join([c for c in category if c.isalnum() or c in "-_"]).lower()
    if not category: category = "uncategorized"
    
    save_dir = ASSETS_ROOT / category
    save_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = save_dir / file.filename
    
    try:
        with open(file_path, "wb") as f:
            while content := await file.read(1024 * 1024):
                f.write(content)
                
        return {
            "status": "ok", 
            "filename": file.filename, 
            "category": category,
            "path": f"{category}/{file.filename}",
            "url": f"/assets_static/{category}/{file.filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

class MoveAssetRequest(BaseModel):
    new_category: str

@app.patch("/assets/{category}/{filename}")
def move_asset(category: str, filename: str, body: MoveAssetRequest, deps = Depends(auth)):
    old_path = (ASSETS_ROOT / category / filename).resolve()
    
    # Special case: if not found in category folder but category is "uncategorized", check root
    if not old_path.exists() and category == "uncategorized":
        alt_path = (ASSETS_ROOT / filename).resolve()
        if alt_path.exists():
            old_path = alt_path

    # Sanitize new category
    new_cat = "".join([c for c in body.new_category if c.isalnum() or c in "-_"]).lower()
    if not new_cat: new_cat = "uncategorized"
    
    new_dir = ASSETS_ROOT / new_cat
    if not new_dir.exists(): new_dir.mkdir(parents=True, exist_ok=True)
    
    new_path = new_dir / filename

    # Security check
    if not str(old_path).startswith(str(ASSETS_ROOT)):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not old_path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if new_path.exists():
        raise HTTPException(status_code=409, detail="File already exists in target category")
        
    try:
        import shutil
        shutil.move(str(old_path), str(new_path))
        return {
            "status": "moved", 
            "filename": filename, 
            "from": category, 
            "to": new_cat,
            "url": f"/assets_static/{new_cat}/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move asset: {e}")

@app.delete("/assets/{category}/{filename}")
def delete_asset(category: str, filename: str, deps = Depends(auth)):
    file_path = (ASSETS_ROOT / category / filename).resolve()
    
    # Security check
    if not str(file_path).startswith(str(ASSETS_ROOT)):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
        
    try:
        file_path.unlink()
        return {"status": "deleted", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {e}")

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

