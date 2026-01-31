import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_LIMIT = 500


def _log_path() -> Path:
    data_root = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
    return data_root / "logs" / "worker.jsonl"


def append_log(entry: Dict[str, Any]) -> None:
    path = _log_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


def read_logs(limit: int = DEFAULT_LIMIT, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    path = _log_path()
    if not path.exists():
        return []

    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except Exception:
        return []

    if not lines:
        return []

    if limit and limit > 0:
        lines = lines[-max(limit * 3, limit):]

    results: List[Dict[str, Any]] = []
    for line in lines:
        try:
            entry = json.loads(line)
        except Exception:
            continue
        if project_id and entry.get("project_id") != project_id:
            continue
        results.append(entry)

    if limit and limit > 0:
        results = results[-limit:]

    return results
