import asyncio
import base64
import shutil
import re
import os
import random
import httpx
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from ..database import ProjectModel, SessionLocal
from .meta_store import load_meta, update_meta
from ..broadcaster import broadcaster

from ..broadcaster import broadcaster

# Import Nodes
from ..nodes.translation import TranslationNode
from ..nodes.tts import TTSNode
from ..nodes.subtitles import SubtitlesNode
from ..nodes.thumbnail import ThumbnailNode
from ..nodes.mastering import MasteringNode



DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
PROJECTS_ROOT = DATA_ROOT / "projects"

STAGE_SEQUENCE = [
    'Text Scrapped', 
    'Text Translated', 
    'Speech Generated', 
    'Subtitles Created', 
    'Thumbnail Created',
    'Master Composition'
]

async def execute_remaining_stages(project_id: str):
    db = SessionLocal()
    try:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            return
        current = project.current_stage
        try:
            idx = STAGE_SEQUENCE.index(current)
        except:
            idx = -1
        stages = STAGE_SEQUENCE[idx + 1:]
        if "Master Composition" in stages:
            stages = stages[:stages.index("Master Composition")]
    finally:
        db.close()

    for stage in stages:
        await execute_stage(project_id, stage)
        check_db = SessionLocal()
        try:
            updated = check_db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
            if not updated:
                return
            if updated.status == "Error":
                break
        finally:
            check_db.close()

async def execute_stage(project_id: str, stage: str):
    db = SessionLocal()
    try:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project: return
        
        p = PROJECTS_ROOT / project_id
        previous_stage = project.current_stage
        
        # Immediate feedback: show target stage and Processing status
        project.status = "Processing"
        project.current_stage = stage
        project.updated_at = datetime.utcnow()
        db.commit()

        update_meta(project_id, {"status": "Processing", "currentStage": stage}, p)

        print(f"--- Executing pipeline stage '{stage}' for {project_id}")
        await broadcaster.broadcast("log", {"level": "info", "message": f"Starting stage '{stage}' for project {project_id}", "project_id": project_id})
        await broadcaster.broadcast("status_update", {"id": project_id, "status": "Processing", "currentStage": stage})
        
        success = False
        success = False
        
        # Node Registry
        node_map = {
            "Text Translated": TranslationNode,
            "Speech Generated": TTSNode,
            "Subtitles Created": SubtitlesNode,
            "Thumbnail Created": ThumbnailNode,
            "Master Composition": MasteringNode
        }
        
        node_class = node_map.get(stage)
        if node_class:
            node = node_class()
            success = await node.execute(p, {"project_id": project_id})
        else:
            print(f"--- Unknown stage: {stage}")
            await broadcaster.broadcast("log", {"level": "error", "message": f"Unknown pipeline stage: {stage}", "project_id": project_id})
            
        if success:
            project.status = "Success"
            print(f"--- Stage '{stage}' success")
            await broadcaster.broadcast("log", {"level": "success", "message": f"Stage '{stage}' completed successfully", "project_id": project_id})
            duration_value = load_meta(project_id, p).get("duration")
            payload = {"id": project_id, "status": "Success", "currentStage": stage}
            if duration_value:
                payload["duration"] = duration_value
            await broadcaster.broadcast("status_update", payload)
        else:
            project.status = "Error"
            # Revert to previous stage on failure to allow retry
            project.current_stage = previous_stage
            print(f"--- Stage '{stage}' failed")
            await broadcaster.broadcast("log", {"level": "error", "message": f"Stage '{stage}' failed", "project_id": project_id})
            await broadcaster.broadcast("status_update", {"id": project_id, "status": "Error", "currentStage": previous_stage})
        
        project.updated_at = datetime.utcnow()
        db.commit()

        update_meta(project_id, {"status": project.status, "currentStage": project.current_stage}, p)

    except Exception as e:
        print(f"--- Critical error in stage {stage}: {e}")
        await broadcaster.broadcast("log", {"level": "error", "message": f"Critical error in stage {stage}: {str(e)}", "project_id": project_id})
        if project:
            try:
                project.status = "Error"
                project.updated_at = datetime.utcnow()
                db.commit()
            except: pass
    finally:
        db.close()


