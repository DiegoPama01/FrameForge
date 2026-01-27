from abc import ABC, abstractmethod
from typing import Any, Dict
from pathlib import Path
from ..broadcaster import broadcaster

class BaseNode(ABC):
    def __init__(self):
        pass

    @abstractmethod
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        """
        Execute the node logic.
        :param project_path: Path object to the project directory.
        :param context: Dictionary containing project metadata/context.
        :return: True if successful, False otherwise.
        """
        pass

    async def log(self, project_id: str, message: str, level: str = "info"):
        """
        Helper to broadcast log messages.
        """
        await broadcaster.broadcast("log", {
            "level": level,
            "message": message,
            "project_id": project_id
        })
