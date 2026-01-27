import os
import json
from pathlib import Path
from typing import Dict, Any
from .base import BaseNode

try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    OpenAI = None
    AsyncOpenAI = None

class SubtitlesNode(BaseNode):
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        await self.log(project_path.name, "Generating subtitles using Whisper API...")
        audio_path = project_path / "audio" / "source" / "full_audio.mp3"
        dst_path = project_path / "subtitles.srt"
        
        if not audio_path.exists():
            await self.log(project_path.name, "Subtitles failed: No audio found", "error")
            return False
            
        try:
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key: 
                await self.log(project_path.name, "Missing OPENAI_API_KEY", "error")
                return False
            if not AsyncOpenAI:
                 await self.log(project_path.name, "OpenAI library not installed", "error")
                 return False

            client = AsyncOpenAI(api_key=api_key)
            
            with open(audio_path, "rb") as audio_file:
                response = await client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    response_format="srt",
                    language="es"
                )
            
            dst_path.write_text(response, encoding="utf-8")
            await self.log(project_path.name, "Subtitles created successfully", "success")
            return True
        except Exception as e:
            await self.log(project_path.name, f"Subtitles Error: {e}", "error")
            return False
