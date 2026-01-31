import asyncio
import math
import os
import random
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from .base import BaseNode
from ..services.meta_store import load_meta, update_meta
from ..database import SessionLocal, AssetModel

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
ASSETS_ROOT = DATA_ROOT / "assets"

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
TRANSITION_DURATION = 0.5
DEFAULT_INTRO_OUTRO_SECONDS = 3.0

class MasteringNode(BaseNode):
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        audio_path = project_path / "audio" / "source" / "full_audio.mp3"
        subtitle_path = project_path / "subtitles.srt"
        if not audio_path.exists():
            await self.log(project_path.name, "Mastering failed: No audio found", "error")
            return False
        if not subtitle_path.exists():
            await self.log(project_path.name, "Mastering failed: No subtitles found", "error")
            return False

        asset_folder = "backgrounds"
        output_format = "mp4"
        background_mode = "category"
        background_video = ""
        segment_minutes = 2
        selection_strategy = "random"
        transition_type = "cut"
        intro_config: Dict[str, Any] = {}
        outro_config: Dict[str, Any] = {}
        meta = load_meta(project_path.name, project_path)
        if meta:
            asset_folder = meta.get("asset_folder", asset_folder)
            output_format = meta.get("output_format", output_format)
            background_mode = meta.get("background_mode", background_mode)
            background_video = meta.get("background_video", background_video)
            segment_minutes = meta.get("background_segment_minutes", segment_minutes)
            selection_strategy = meta.get("background_strategy", selection_strategy)
            transition_type = meta.get("background_transition", transition_type)
            intro_config = meta.get("intro_config") or {}
            outro_config = meta.get("outro_config") or {}

        duration = await self._get_audio_duration(audio_path)
        if not duration or duration <= 0:
            await self.log(project_path.name, "Mastering failed: Unable to detect audio duration", "error")
            return False

        out_dir = project_path / "video"
        out_dir.mkdir(parents=True, exist_ok=True)
        output_path = out_dir / "final.mp4"
        temp_dir = project_path / "video" / "parts"
        temp_dir.mkdir(parents=True, exist_ok=True)

        target_w, target_h = self._target_resolution(output_format)
        main_bg = temp_dir / "main_background.mp4"
        main_subbed = temp_dir / "final_video_subs.mp4"

        await self.log(project_path.name, "Building background track for final export...")
        bg_ok = await self._build_background_video(
            project_path.name,
            main_bg,
            duration,
            target_w,
            target_h,
            asset_folder,
            background_mode,
            background_video,
            segment_minutes,
            selection_strategy,
            transition_type
        )
        if not bg_ok:
            await self.log(project_path.name, "Mastering failed: Unable to build background track", "error")
            return False

        intro_path, intro_dur = await self._build_intro_outro_segment(
            project_path,
            intro_config,
            "intro",
            target_w,
            target_h
        )
        outro_path, outro_dur = await self._build_intro_outro_segment(
            project_path,
            outro_config,
            "outro",
            target_w,
            target_h
        )

        segments: List[Path] = []
        durations: List[float] = []
        if intro_path:
            segments.append(intro_path)
            durations.append(intro_dur)
        segments.append(main_bg)
        durations.append(duration)
        if outro_path:
            segments.append(outro_path)
            durations.append(outro_dur)

        concat_video = temp_dir / "final_video_noaudio.mp4"
        if transition_type != "cut" and len(segments) > 1:
            concat_ok = await self._concat_segments_xfade(segments, durations, concat_video, transition_type)
        else:
            concat_ok = await self._concat_segments(segments, concat_video)
        if not concat_ok:
            await self.log(project_path.name, "Mastering failed: Unable to concatenate segments", "error")
            return False

        subtitle_offset = intro_dur
        if transition_type != "cut" and intro_dur > 0 and len(segments) > 1:
            subtitle_offset = max(0.0, intro_dur - TRANSITION_DURATION)

        await self.log(project_path.name, "Burning subtitles onto final sequence...")
        sub_ok = await self._apply_subtitles(concat_video, subtitle_path, target_w, target_h, main_subbed, subtitle_offset)
        if not sub_ok:
            await self.log(project_path.name, "Mastering failed: Unable to render subtitles", "error")
            return False

        total_duration = sum(durations)
        if transition_type != "cut" and len(segments) > 1:
            total_duration -= TRANSITION_DURATION * (len(segments) - 1)

        await self.log(project_path.name, "Building final audio track...")
        intro_voice = project_path / "video" / "parts" / "intro_voice.mp3"
        outro_voice = project_path / "video" / "parts" / "outro_voice.mp3"
        final_audio = temp_dir / "final_audio.m4a"
        outro_offset = subtitle_offset + duration
        if transition_type != "cut" and outro_dur > 0 and len(segments) > 1:
            outro_offset = max(subtitle_offset, subtitle_offset + duration - TRANSITION_DURATION)
        audio_ok = await self._build_final_audio(
            audio_path,
            intro_voice if intro_voice.exists() else None,
            outro_voice if outro_voice.exists() else None,
            subtitle_offset,
            duration,
            outro_offset,
            total_duration,
            final_audio
        )
        if not audio_ok:
            await self.log(project_path.name, "Mastering failed: Unable to build final audio track", "error")
            return False

        await self.log(project_path.name, "Muxing audio with final sequence...")
        mux_ok = await self._mux_video_audio(main_subbed, final_audio, output_path)
        if not mux_ok:
            await self.log(project_path.name, "Mastering failed: Unable to mux audio", "error")
            return False

        if output_path.exists() and output_path.stat().st_size > 0:
            update_meta(project_path.name, {
                "final_video": str(output_path.name),
                "final_duration": total_duration
            }, project_path)
            await self.log(project_path.name, "Final video saved successfully", "success")
            return True

        await self.log(project_path.name, "Mastering failed: Output video missing", "error")
        return False

    async def _build_background_video(
        self,
        project_id: str,
        output_path: Path,
        duration: float,
        target_w: int,
        target_h: int,
        asset_folder: str,
        mode: str,
        background_video: str,
        segment_minutes: float,
        selection_strategy: str,
        transition_type: str
    ) -> bool:
        await self.log(
            project_id,
            f"Background config: mode={mode} folder={asset_folder} single={background_video or '-'} "
            f"segment={segment_minutes}m strategy={selection_strategy} transition={transition_type}",
            "info"
        )
        if mode == "single" and background_video:
            src = ASSETS_ROOT / background_video
            if not src.exists():
                await self.log(project_id, f"Background video not found: {background_video}", "error")
            else:
                await self.log(project_id, f"Using single background video: {background_video}", "info")
                return await self._build_looped_video(src, duration, target_w, target_h, output_path, project_id)

        candidates = self._collect_candidates(asset_folder)
        if not candidates:
            await self.log(project_id, f"No background videos found in {asset_folder}", "error")
            return False
        await self.log(project_id, f"Background candidates: {len(candidates)}", "info")

        segment_len = max(10.0, float(segment_minutes or 2) * 60.0)
        await self.log(
            project_id,
            f"Background target duration={duration:.1f}s segment_len={segment_len:.1f}s",
            "info"
        )
        segments = await self._plan_segments(candidates, duration, segment_len, selection_strategy, transition_type)
        await self.log(
            project_id,
            "Segments: " + ", ".join([f"{s['path'].name}@{s['duration']:.1f}s" for s in segments]),
            "info"
        )
        await self.log(
            project_id,
            "Segments detail: " + ", ".join([
                f"{s['path'].name} start={s['start']:.1f}s dur={s['duration']:.1f}s loop={'yes' if s['loop'] else 'no'}"
                for s in segments
            ]),
            "info"
        )

        if transition_type == "cut":
            return await self._build_segments_cut(segments, target_w, target_h, output_path, project_id)
        xfade_ok = await self._build_segments_xfade(segments, target_w, target_h, output_path, transition_type, project_id)
        if xfade_ok:
            return True
        await self.log(project_id, "Background xfade failed, retrying with cut...", "error")
        return await self._build_segments_cut(segments, target_w, target_h, output_path, project_id)

    def _collect_candidates(self, asset_folder: str) -> List[Path]:
        candidates: List[Path] = []

        # First try to resolve by asset categories stored in DB
        try:
            db = SessionLocal()
            assets = db.query(AssetModel).all()
            for asset in assets:
                try:
                    cats = json.loads(asset.categories or "[]")
                except Exception:
                    cats = []
                if asset_folder and asset_folder not in cats:
                    continue
                path = ASSETS_ROOT / asset.id
                if path.exists() and path.suffix.lower() in VIDEO_EXTS:
                    candidates.append(path)
        except Exception:
            candidates = []
        finally:
            try:
                db.close()
            except Exception:
                pass

        # Fallback to physical folder scan
        if not candidates and asset_folder:
            folder = ASSETS_ROOT / asset_folder
            if folder.exists():
                candidates = [p for p in folder.rglob("*") if p.suffix.lower() in VIDEO_EXTS]

        # Last resort: scan all assets (only when no category was requested)
        if not candidates and not asset_folder and ASSETS_ROOT.exists():
            candidates = [p for p in ASSETS_ROOT.rglob("*") if p.suffix.lower() in VIDEO_EXTS]

        return candidates

    async def _plan_segments(
        self,
        candidates: List[Path],
        duration: float,
        segment_len: float,
        strategy: str,
        transition_type: str
    ) -> List[Dict[str, Any]]:
        count = max(1, int(math.ceil(duration / segment_len)))
        segments: List[Dict[str, Any]] = []
        shuffle = candidates[:]
        if strategy == "random":
            random.shuffle(shuffle)
        else:
            shuffle.sort(key=lambda p: p.name.lower())
        transition_bonus = 0.0
        if transition_type != "cut" and count > 1:
            transition_bonus = TRANSITION_DURATION * (count - 1)

        for idx in range(count):
            src = shuffle[idx % len(shuffle)]
            seg_duration = segment_len
            if idx == count - 1:
                seg_duration = max(3.0, duration - segment_len * (count - 1) + transition_bonus)
            src_duration = await self._get_media_duration(src)
            loop = False
            start = 0.0
            if src_duration and src_duration > seg_duration:
                if strategy == "random":
                    start = random.uniform(0.0, max(0.0, src_duration - seg_duration))
                else:
                    start = 0.0
            else:
                loop = True
            segments.append({
                "path": src,
                "start": start,
                "duration": seg_duration,
                "loop": loop
            })
        return segments

    async def _build_looped_video(
        self,
        src: Path,
        duration: float,
        target_w: int,
        target_h: int,
        output_path: Path,
        project_id: Optional[str] = None
    ) -> bool:
        vf = self._scale_filter(target_w, target_h)
        cmd = [
            "ffmpeg",
            "-y",
            "-stream_loop", "-1",
            "-i", str(src),
            "-t", f"{duration:.2f}",
            "-vf", vf,
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd, project_id, "looped background")

    async def _build_segments_cut(
        self,
        segments: List[Dict[str, Any]],
        target_w: int,
        target_h: int,
        output_path: Path,
        project_id: Optional[str] = None
    ) -> bool:
        temp_files: List[Path] = []
        vf = self._scale_filter(target_w, target_h)
        for idx, segment in enumerate(segments):
            temp_path = output_path.parent / f"bg_seg_{idx:02d}.mp4"
            temp_files.append(temp_path)
            cmd = ["ffmpeg", "-y"]
            if segment["loop"]:
                cmd += ["-stream_loop", "-1"]
            if segment["start"] > 0:
                cmd += ["-ss", f"{segment['start']:.2f}"]
            cmd += ["-t", f"{segment['duration']:.2f}", "-i", str(segment["path"])]
            cmd += ["-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", str(temp_path)]
            ok = await self._run_ffmpeg(cmd, project_id, f"bg segment {idx + 1}")
            if not ok:
                return False

        concat_list = output_path.parent / "bg_concat.txt"
        concat_list.write_text("".join([f"file '{p.as_posix()}'\n" for p in temp_files]), encoding="utf-8")
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd, project_id, "concat background")

    async def _build_segments_xfade(
        self,
        segments: List[Dict[str, Any]],
        target_w: int,
        target_h: int,
        output_path: Path,
        transition_type: str,
        project_id: Optional[str] = None
    ) -> bool:
        if len(segments) == 1:
            return await self._build_segments_cut(segments, target_w, target_h, output_path, project_id)

        transition = "fade"
        if transition_type == "blur_fade":
            transition = "fadeblack"

        vf_scale = self._scale_filter(target_w, target_h)
        cmd = ["ffmpeg", "-y"]
        for segment in segments:
            if segment["loop"]:
                cmd += ["-stream_loop", "-1"]
            if segment["start"] > 0:
                cmd += ["-ss", f"{segment['start']:.2f}"]
            cmd += ["-t", f"{segment['duration']:.2f}", "-i", str(segment["path"])]

        filter_parts = []
        for idx in range(len(segments)):
            filter_parts.append(f"[{idx}:v]{vf_scale},fps=30,format=yuv420p,settb=1/1000[v{idx}]")

        offset = segments[0]["duration"] - TRANSITION_DURATION
        chain = "v0"
        for idx in range(1, len(segments)):
            next_chain = f"vx{idx}"
            filter_parts.append(
                f"[{chain}][v{idx}]xfade=transition={transition}:duration={TRANSITION_DURATION}:offset={offset:.2f}[{next_chain}]"
            )
            chain = next_chain
            offset += segments[idx]["duration"] - TRANSITION_DURATION

        filter_complex = ";".join(filter_parts)
        cmd += [
            "-filter_complex", filter_complex,
            "-map", f"[{chain}]",
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd, project_id, "xfade background")

    async def _apply_subtitles(
        self,
        input_video: Path,
        subtitle_path: Path,
        target_w: int,
        target_h: int,
        output_path: Path,
        offset: float
    ) -> bool:
        effective_subs = subtitle_path
        if offset > 0:
            shifted = output_path.parent / "subtitles_shifted.srt"
            self._shift_srt(subtitle_path, shifted, offset)
            effective_subs = shifted
        subtitle_filter = self._escape_subtitles_path(effective_subs)
        vf = f"{self._scale_filter(target_w, target_h)},subtitles='{subtitle_filter}'"
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(input_video),
            "-vf", vf,
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd)

    async def _build_intro_outro_segment(
        self,
        project_path: Path,
        config: Dict[str, Any],
        label: str,
        target_w: int,
        target_h: int
    ) -> Tuple[Optional[Path], float]:
        if not config:
            return None, 0.0
        duration = float(config.get("duration") or DEFAULT_INTRO_OUTRO_SECONDS)
        mode = config.get("mode", "compose")
        await self.log(project_path.name, f"{label.title()} config: mode={mode} duration={duration}s video={config.get('video') or '-'}", "info")
        output_path = project_path / "video" / "parts" / f"{label}_segment.mp4"
        voice_mode = config.get("voice", "same")
        text = str(config.get("text") or "")
        audio_path: Optional[Path] = None
        audio_duration = 0.0

        if text.strip():
            voice = None
            meta = load_meta(project_path.name, project_path)
            text = self._resolve_placeholders(text, meta)
            if voice_mode == "same":
                voice = meta.get("global_voice_style") if meta else None
            if not voice:
                voice = "es-ES-AlvaroNeural"
            audio_path = project_path / "video" / "parts" / f"{label}_voice.mp3"
            audio_ok = await self._generate_tts(text, voice, audio_path)
            if audio_ok:
                audio_duration = (await self._get_media_duration(audio_path)) or 0.0
                if audio_duration > duration:
                    duration = audio_duration

        if mode == "video":
            video_path = config.get("video")
            if not video_path:
                return None, 0.0
            src = ASSETS_ROOT / video_path
            if not src.exists():
                return None, 0.0
            ok = await self._build_looped_video(src, duration, target_w, target_h, output_path)
            if ok and audio_path:
                ok = await self._mux_segment_audio(output_path, audio_path, duration)
            return (output_path if ok else None), (duration if ok else 0.0)

        preview_path = project_path / "video" / "parts" / f"{label}_preview.png"
        overlay_path = project_path / "video" / "parts" / f"{label}_overlay.png"
        if not preview_path.exists() and not overlay_path.exists():
            return None, 0.0
        vf = self._scale_filter(target_w, target_h)
        if config.get("video"):
            bg = ASSETS_ROOT / config.get("video")
            if bg.exists():
                if overlay_path.exists():
                    ok = await self._build_overlay_video(bg, overlay_path, duration, target_w, target_h, output_path)
                else:
                    ok = await self._build_looped_video(bg, duration, target_w, target_h, output_path)
            elif preview_path.exists():
                ok = await self._build_still_video(preview_path, duration, vf, output_path)
            else:
                ok = False
        else:
            ok = await self._build_still_video(preview_path, duration, vf, output_path)
        if ok and audio_path:
            ok = await self._mux_segment_audio(output_path, audio_path, duration)
        return (output_path if ok else None), (duration if ok else 0.0)

    async def _concat_segments(self, segments: List[Path], output_path: Path) -> bool:
        if len(segments) == 1:
            return await self._run_ffmpeg([
                "ffmpeg", "-y",
                "-i", str(segments[0]),
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "23",
                "-an",
                str(output_path)
            ])
        concat_list = output_path.parent / "final_concat.txt"
        concat_list.write_text("".join([f"file '{p.as_posix()}'\n" for p in segments]), encoding="utf-8")
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-an",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd)

    async def _concat_segments_xfade(
        self,
        segments: List[Path],
        durations: List[float],
        output_path: Path,
        transition_type: str
    ) -> bool:
        if len(segments) == 1:
            return await self._concat_segments(segments, output_path)

        transition = "fade"
        if transition_type == "blur_fade":
            transition = "fadeblack"

        cmd = ["ffmpeg", "-y"]
        for segment in segments:
            cmd += ["-i", str(segment)]

        filter_parts = []
        for idx in range(len(segments)):
            filter_parts.append(f"[{idx}:v]format=yuv420p[v{idx}]")

        offset = durations[0] - TRANSITION_DURATION
        chain = "v0"
        for idx in range(1, len(segments)):
            next_chain = f"vx{idx}"
            filter_parts.append(
                f"[{chain}][v{idx}]xfade=transition={transition}:duration={TRANSITION_DURATION}:offset={offset:.2f}[{next_chain}]"
            )
            chain = next_chain
            offset += durations[idx] - TRANSITION_DURATION

        filter_complex = ";".join(filter_parts)
        cmd += [
            "-filter_complex", filter_complex,
            "-map", f"[{chain}]",
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd)

    async def _mux_video_audio(self, video_path: Path, audio_path: Path, output_path: Path) -> bool:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd)

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

    async def _get_media_duration(self, path: Path) -> Optional[float]:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path)
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

    def _scale_filter(self, target_w: int, target_h: int) -> str:
        if target_w >= target_h:
            return f"scale={target_w}:-2,crop={target_w}:{target_h}:(in_w-out_w)/2:(in_h-out_h)/2"
        return f"scale=-2:{target_h},crop={target_w}:{target_h}:(in_w-out_w)/2:(in_h-out_h)/2"

    def _escape_subtitles_path(self, subtitle_path: Path) -> str:
        value = str(subtitle_path)
        return value.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")

    def _resolve_placeholders(self, text: str, meta: Dict[str, Any]) -> str:
        if not text:
            return ""
        values = {}
        if meta:
            for key, value in meta.items():
                if value is None:
                    continue
                if isinstance(value, (str, int, float, bool)):
                    values[str(key)] = str(value)
        def repl(match):
            key = match.group(1)
            return values.get(key, "")
        return re.sub(r"{{\s*([\w.-]+)\s*}}", repl, text)

    async def _build_still_video(self, image_path: Path, duration: float, vf: str, output_path: Path) -> bool:
        cmd = [
            "ffmpeg",
            "-y",
            "-loop", "1",
            "-i", str(image_path),
            "-t", f"{duration:.2f}",
            "-vf", f"{vf},format=yuv420p",
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd)

    async def _build_overlay_video(
        self,
        background: Path,
        overlay: Path,
        duration: float,
        target_w: int,
        target_h: int,
        output_path: Path
    ) -> bool:
        vf = self._scale_filter(target_w, target_h)
        cmd = [
            "ffmpeg",
            "-y",
            "-stream_loop", "-1",
            "-i", str(background),
            "-loop", "1",
            "-i", str(overlay),
            "-t", f"{duration:.2f}",
            "-filter_complex", f"[0:v]{vf}[bg];[1:v]{vf}[ov];[bg][ov]overlay=0:0:format=auto,format=yuv420p",
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            str(output_path)
        ]
        return await self._run_ffmpeg(cmd)

    def _shift_srt(self, source: Path, target: Path, offset: float):
        try:
            lines = source.read_text(encoding="utf-8", errors="replace").splitlines()
            output: List[str] = []
            for line in lines:
                if "-->" not in line:
                    output.append(line)
                    continue
                parts = [p.strip() for p in line.split("-->")]
                if len(parts) != 2:
                    output.append(line)
                    continue
                start = self._shift_srt_time(parts[0], offset)
                end = self._shift_srt_time(parts[1], offset)
                output.append(f"{start} --> {end}")
            target.write_text("\n".join(output), encoding="utf-8")
        except:
            pass

    def _shift_srt_time(self, value: str, offset: float) -> str:
        try:
            hh, mm, rest = value.split(":")
            ss, ms = rest.split(",")
            total = int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000.0
            total = max(0.0, total + offset)
            hh = int(total // 3600)
            mm = int((total % 3600) // 60)
            ss = int(total % 60)
            ms = int((total - int(total)) * 1000)
            return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"
        except:
            return value

    async def _generate_tts(self, text: str, voice: str, output_path: Path) -> bool:
        cmd = [
            "edge-tts",
            "--voice", voice,
            "--text", text,
            "--write-media", str(output_path)
        ]
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            if process.returncode != 0:
                return False
        except:
            return False
        return output_path.exists()

    async def _mux_segment_audio(self, video_path: Path, audio_path: Path, duration: float) -> bool:
        temp_path = video_path.parent / f"{video_path.stem}_aud.mp4"
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-filter_complex", f"[1:a]apad=pad_dur={duration:.2f}[a]",
            "-map", "0:v:0",
            "-map", "[a]",
            "-t", f"{duration:.2f}",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            str(temp_path)
        ]
        ok = await self._run_ffmpeg(cmd)
        if ok and temp_path.exists():
            temp_path.replace(video_path)
        return ok

    async def _build_final_audio(
        self,
        main_audio: Path,
        intro_audio: Optional[Path],
        outro_audio: Optional[Path],
        main_offset: float,
        main_duration: float,
        outro_offset: float,
        total_duration: float,
        output_path: Path
    ) -> bool:
        inputs: List[str] = []
        filter_parts: List[str] = []
        mix_inputs: List[str] = []
        idx = 0

        inputs += ["-i", str(main_audio)]
        filter_parts.append(f"[{idx}:a]atrim=0:{main_duration:.2f},asetpts=PTS-STARTPTS,adelay={int(main_offset*1000)}|{int(main_offset*1000)}[maina]")
        mix_inputs.append("[maina]")
        idx += 1

        if intro_audio:
            inputs += ["-i", str(intro_audio)]
            filter_parts.append(f"[{idx}:a]asetpts=PTS-STARTPTS[inta]")
            mix_inputs.append("[inta]")
            idx += 1

        if outro_audio:
            inputs += ["-i", str(outro_audio)]
            filter_parts.append(f"[{idx}:a]asetpts=PTS-STARTPTS,adelay={int(outro_offset*1000)}|{int(outro_offset*1000)}[outa]")
            mix_inputs.append("[outa]")
            idx += 1

        filter_parts.append("".join(mix_inputs) + f"amix=inputs={len(mix_inputs)}:duration=longest:dropout_transition=0,atrim=0:{total_duration:.2f}[aout]")
        filter_complex = ";".join(filter_parts)

        cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filter_complex, "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", str(output_path)]
        return await self._run_ffmpeg(cmd)

    async def _run_ffmpeg(self, cmd: List[str], project_id: Optional[str] = None, context: str = "ffmpeg") -> bool:
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await process.communicate()
            if process.returncode != 0:
                if project_id:
                    err_msg = stderr.decode(errors="ignore")[-600:]
                    await self.log(project_id, f"{context} failed: {err_msg}", "error")
                return False
        except:
            return False
        return True
