import asyncio
from typing import List, Dict, Any
import json

class Broadcaster:
    def __init__(self):
        self._listeners: List[asyncio.Queue] = []

    async def connect(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._listeners.append(queue)
        return queue

    def disconnect(self, queue: asyncio.Queue):
        if queue in self._listeners:
            self._listeners.remove(queue)

    async def broadcast(self, event_type: str, data: Any):
        if not self._listeners:
            return
            
        message = {
            "type": event_type,
            "data": data,
            "timestamp": None  # Will be added by frontend or use current time
        }
        
        # Format as SSE string
        # Default event type is 'message' if not specified
        # We wrap the actual type inside the data
        
        final_data = {
            "type": event_type,
            "data": data,
            "timestamp": None 
        }
        
        body = f"data: {json.dumps(final_data)}\n\n"
        
        for queue in self._listeners:
            try:
                await queue.put(body)
            except:
                pass

broadcaster = Broadcaster()
