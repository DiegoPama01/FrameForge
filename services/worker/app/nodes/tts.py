import asyncio
import random
import json
from pathlib import Path
from typing import Dict, Any, List
from .base import BaseNode

# Using edge-tts for Speech (Free)
try:
    import edge_tts
except ImportError:
    edge_tts = None

class TTSNode(BaseNode):
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        # Determine the input text file (prefer translated)
        txt_path = project_path / "text" / "story_translated.txt"
        if not txt_path.exists():
            txt_path = project_path / "text" / "story.txt"
        
        if not txt_path.exists():
            await self.log(project_path.name, "TTS failed: No text file found", "error")
            return False
        
        out_dir = (project_path / "audio" / "source").resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
        combined_audio = out_dir / "full_audio.mp3"
        
        await self.log(project_path.name, f"Generating TTS from {txt_path.name}...")
        
        # Voice selection
        male_voices = ["es-ES-AlvaroNeural", "es-MX-JorgeNeural", "es-AR-TomasNeural"]
        female_voices = ["es-ES-ElviraNeural", "es-MX-DaliaNeural", "es-AR-ElenaNeural"]
        
        meta_path = project_path / "meta.json"
        gender = "male"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                gender = meta.get("narrator_gender", "male")
            except: pass
        
        voice_pool = female_voices if gender == "female" else male_voices
        
        max_retries = 5
        success = False
        
        for attempt in range(max_retries):
            # Rotate through different voices
            current_voice = voice_pool[attempt % len(voice_pool)]
            
            await self.log(project_path.name, f"TTS Attempt {attempt+1}/{max_retries} with voice: {current_voice}")
            
            cmd = [
                "edge-tts", 
                "--voice", current_voice, 
                "--file", str(txt_path), 
                "--write-media", str(combined_audio)
            ]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # Wait with timeout
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), 
                    timeout=300  # 5 minutes max
                )
                
                if process.returncode == 0 and combined_audio.exists() and combined_audio.stat().st_size > 0:
                    await self.log(project_path.name, f"TTS Success with {current_voice}", "success")
                    success = True
                    
                    # Get audio duration using ffprobe
                    await self._save_duration(project_path, combined_audio)
                    break
                else:
                    err_msg = stderr.decode()
                    await self.log(project_path.name, f"TTS Attempt {attempt+1} failed: {err_msg[:200]}", "error")
                    
            except asyncio.TimeoutError:
                await self.log(project_path.name, f"TTS Attempt {attempt+1} timed out", "error")
            except Exception as e:
                await self.log(project_path.name, f"TTS Attempt {attempt+1} exception: {e}", "error")
            
            # Exponential backoff
            if attempt < max_retries - 1:
                delay = 3 * (2 ** attempt) + random.uniform(0, 2)
                await asyncio.sleep(delay)
        
        if not success:
            await self.log(project_path.name, "TTS failed after all attempts", "error")
        
        return success

    async def _save_duration(self, project_path: Path, audio_path: Path):
        try:
            duration_cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(audio_path)
            ]
            duration_process = await asyncio.create_subprocess_exec(
                *duration_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            duration_stdout, _ = await duration_process.communicate()
            
            if duration_process.returncode == 0:
                duration_seconds = float(duration_stdout.decode().strip())
                minutes = int(duration_seconds // 60)
                seconds = int(duration_seconds % 60)
                duration_str = f"{minutes:02d}:{seconds:02d}"
                
                meta_path = project_path / "meta.json"
                if meta_path.exists():
                    try:
                        meta = json.loads(meta_path.read_text())
                        meta["duration"] = duration_str
                        meta_path.write_text(json.dumps(meta, indent=4))
                    except: pass
        except: pass
