import json
from pathlib import Path
from typing import Any, Dict, Optional

from ..database import SessionLocal, ProjectModel


def _load_meta_from_db(project_id: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project or not project.meta_json:
            return {}
        try:
            return json.loads(project.meta_json)
        except Exception:
            return {}
    finally:
        db.close()


def _save_meta_to_db(project_id: str, meta: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            return
        project.meta_json = json.dumps(meta)
        db.commit()
    finally:
        db.close()


def load_meta(project_id: str, project_path: Optional[Path] = None) -> Dict[str, Any]:
    meta = _load_meta_from_db(project_id)
    if meta:
        return meta
    if project_path is None:
        return {}
    meta_path = project_path / "meta.json"
    if not meta_path.exists():
        return {}
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        _save_meta_to_db(project_id, meta)
        return meta
    except Exception:
        return {}


def save_meta(project_id: str, meta: Dict[str, Any], project_path: Optional[Path] = None) -> None:
    _save_meta_to_db(project_id, meta)
    if project_path is None:
        return
    meta_path = project_path / "meta.json"
    try:
        meta_path.write_text(json.dumps(meta, indent=4), encoding="utf-8")
    except Exception:
        pass


def update_meta(project_id: str, updates: Dict[str, Any], project_path: Optional[Path] = None) -> Dict[str, Any]:
    meta = load_meta(project_id, project_path)
    meta.update(updates)
    save_meta(project_id, meta, project_path)
    return meta
