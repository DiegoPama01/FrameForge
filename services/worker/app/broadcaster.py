import asyncio
from typing import List, Any
import json
from datetime import datetime

from .services.log_store import append_log

class Broadcaster:
    def __init__(self):
        self._listeners: List[asyncio.Queue] = []
        self._log_lock = asyncio.Lock()

    async def connect(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._listeners.append(queue)
        return queue

    def disconnect(self, queue: asyncio.Queue):
        if queue in self._listeners:
            self._listeners.remove(queue)

    async def _persist_log(self, record: dict):
        async with self._log_lock:
            await asyncio.to_thread(append_log, record)

    async def broadcast(self, event_type: str, data: Any):
        timestamp = datetime.utcnow().isoformat()
        if event_type == "log":
            entry = data if isinstance(data, dict) else {"message": str(data)}
            record = {
                "timestamp": timestamp,
                "level": entry.get("level", "info"),
                "message": entry.get("message", ""),
                "project_id": entry.get("project_id")
            }
            await self._persist_log(record)

        if not self._listeners:
            return

        final_data = {
            "type": event_type,
            "data": data,
            "timestamp": timestamp
        }

        body = f"data: {json.dumps(final_data)}\n\n"

        for queue in self._listeners:
            try:
                await queue.put(body)
            except:
                pass

broadcaster = Broadcaster()
