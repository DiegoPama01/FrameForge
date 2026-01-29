import asyncio
import json
import os
import random
from pathlib import Path
from typing import Dict, Any, Optional

from .base import BaseNode

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
ASSETS_ROOT = DATA_ROOT / "assets"

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}

class MasteringNode(BaseNode):
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        audio_path = project_path / "audio" / "source" / "full_audio.mp3"
        subtitle_path = project_path / "subtitles.srt"
        meta_path = project_path / "meta.json"

        if not audio_path.exists():
            await self.log(project_path.name, "Mastering failed: No audio found", "error")
            return False
        if not subtitle_path.exists():
            await self.log(project_path.name, "Mastering failed: No subtitles found", "error")
            return False

        asset_folder = "backgrounds"
        output_format = "mp4"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                asset_folder = meta.get("asset_folder", asset_folder)
                output_format = meta.get("output_format", output_format)
            except: 
                pass

        background = self._pick_background(asset_folder)
        if not background:
            await self.log(project_path.name, f"Mastering failed: No background video found in {asset_folder}", "error")
            return False

        duration = await self._get_audio_duration(audio_path)
        if not duration or duration <= 0:
            await self.log(project_path.name, "Mastering failed: Unable to detect audio duration", "error")
            return False

        out_dir = project_path / "video"
        out_dir.mkdir(parents=True, exist_ok=True)
        output_path = out_dir / "final.mp4"

        target_w, target_h = self._target_resolution(output_format)
        subtitle_filter = self._escape_subtitles_path(subtitle_path)
        if target_w >= target_h:
            vf = f"scale={target_w}:-2,crop={target_w}:{target_h},subtitles='{subtitle_filter}'"
        else:
            vf = f"scale=-2:{target_h},crop={target_w}:{target_h},subtitles='{subtitle_filter}'"

        await self.log(project_path.name, "Compositing final video (audio + subtitles + background)...")
        cmd = [
            "ffmpeg",
            "-y",
            "-stream_loop", "-1",
            "-i", str(background),
            "-i", str(audio_path),
            "-t", f"{duration:.2f}",
            "-vf", vf,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(output_path)
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await process.communicate()
            if process.returncode != 0:
                err_msg = stderr.decode(errors="ignore")[-500:]
                await self.log(project_path.name, f"Mastering failed: {err_msg}", "error")
                return False
        except Exception as e:
            await self.log(project_path.name, f"Mastering exception: {e}", "error")
            return False

        if output_path.exists() and output_path.stat().st_size > 0:
            await self._update_meta(meta_path, output_path)
            await self.log(project_path.name, "Final video saved successfully", "success")
            return True

        await self.log(project_path.name, "Mastering failed: Output video missing", "error")
        return False

    def _pick_background(self, asset_folder: str) -> Optional[Path]:
        folder = ASSETS_ROOT / asset_folder
        candidates = []

        if folder.exists():
            candidates = [p for p in folder.rglob("*") if p.suffix.lower() in VIDEO_EXTS]

        if not candidates and ASSETS_ROOT.exists():
            candidates = [p for p in ASSETS_ROOT.rglob("*") if p.suffix.lower() in VIDEO_EXTS]

        if not candidates:
            return None
        return random.choice(candidates)

    async def _get_audio_duration(self, audio_path: Path) -> Optional[float]:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(audio_path)
        ]
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            if process.returncode == 0:
                return float(stdout.decode().strip())
        except: 
            return None
        return None

    def _target_resolution(self, output_format: str) -> tuple:
        if output_format == "4k_vertical":
            return (2160, 3840)
        if output_format == "mp4_horizontal":
            return (1920, 1080)
        if output_format == "4k_horizontal":
            return (3840, 2160)
        return (1080, 1920)

    def _escape_subtitles_path(self, subtitle_path: Path) -> str:
        value = str(subtitle_path)
        return value.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")

    async def _update_meta(self, meta_path: Path, output_path: Path) -> None:
        if not meta_path.exists():
            return
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            meta["final_video"] = str(output_path.name)
            meta_path.write_text(json.dumps(meta, indent=4))
        except:
            pass
