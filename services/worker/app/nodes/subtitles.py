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
        meta_path = project_path / "meta.json"
        
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
            
            caption_mode = "line"
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                    caption_mode = meta.get("caption_mode", caption_mode)
                except:
                    pass

            if str(caption_mode).lower() in ["word", "word_by_word", "word-by-word", "wordbyword"]:
                entries = self._parse_srt_entries(response)
                word_entries = self._wordify_entries(entries)
                cleaned = self._format_entries(word_entries)
            else:
                cleaned = self._shorten_srt(response, max_chars=42, max_lines=2)
            dst_path.write_text(cleaned, encoding="utf-8")
            await self.log(project_path.name, "Subtitles created successfully", "success")
            return True
        except Exception as e:
            await self.log(project_path.name, f"Subtitles Error: {e}", "error")
            return False

    def _parse_srt_entries(self, srt_text: str):
        blocks = [b for b in srt_text.strip().split("\n\n") if b.strip()]
        entries = []
        for block in blocks:
            lines = block.strip().splitlines()
            if len(lines) < 2:
                continue
            time_line = lines[1].strip()
            text = " ".join(l.strip() for l in lines[2:]).strip()
            start, end = self._parse_time_range(time_line)
            if start is None or end is None:
                continue
            entries.append({"start": start, "end": end, "text": text})
        return entries

    def _wordify_entries(self, entries, min_duration: float = 0.08):
        output = []
        for entry in entries:
            text = entry.get("text", "")
            words = [w for w in text.replace("\n", " ").split(" ") if w]
            if not words:
                continue
            start = entry["start"]
            end = entry["end"]
            total_duration = max(0.0, end - start)
            if total_duration <= 0:
                continue

            total_chars = sum(len(w) for w in words) or len(words)
            durations = [max(total_duration * (len(w) / total_chars), min_duration) for w in words]
            duration_sum = sum(durations)
            if duration_sum <= 0:
                continue
            scale = total_duration / duration_sum
            durations = [d * scale for d in durations]

            cursor = start
            for idx, word in enumerate(words):
                if idx == len(words) - 1:
                    word_end = end
                else:
                    word_end = cursor + durations[idx]
                output.append({
                    "start": cursor,
                    "end": word_end,
                    "text": word
                })
                cursor = word_end
        return output

    def _format_entries(self, entries):
        out_lines = []
        for idx, entry in enumerate(entries, start=1):
            out_lines.append(str(idx))
            out_lines.append(f"{self._format_time(entry['start'])} --> {self._format_time(entry['end'])}")
            out_lines.append(entry["text"])
            out_lines.append("")
        return "\n".join(out_lines).strip() + "\n"

    def _shorten_srt(self, srt_text: str, max_chars: int = 42, max_lines: int = 2) -> str:
        blocks = [b for b in srt_text.strip().split("\n\n") if b.strip()]
        entries = []
        for block in blocks:
            lines = block.strip().splitlines()
            if len(lines) < 2:
                continue
            time_line = lines[1].strip()
            text = " ".join(l.strip() for l in lines[2:]).strip()
            start, end = self._parse_time_range(time_line)
            if start is None or end is None:
                continue
            entries.extend(self._split_entry(start, end, text, max_chars, max_lines))

        out_lines = []
        for idx, entry in enumerate(entries, start=1):
            out_lines.append(str(idx))
            out_lines.append(f"{self._format_time(entry['start'])} --> {self._format_time(entry['end'])}")
            out_lines.extend(entry["text"].split("\n"))
            out_lines.append("")
        return "\n".join(out_lines).strip() + "\n"

    def _split_entry(self, start: float, end: float, text: str, max_chars: int, max_lines: int):
        if not text:
            return []
        lines = self._wrap_text(text, max_chars)
        if not lines:
            return []

        # Group into captions with max_lines per caption
        captions = []
        for i in range(0, len(lines), max_lines):
            captions.append("\n".join(lines[i:i + max_lines]))

        if len(captions) == 1:
            return [{"start": start, "end": end, "text": captions[0]}]

        total_duration = max(0.0, end - start)
        word_counts = [len(c.replace("\n", " ").split()) for c in captions]
        total_words = sum(word_counts) or len(captions)

        min_dur = 0.7
        if total_duration > min_dur * len(captions):
            remaining = total_duration - min_dur * len(captions)
            durations = [min_dur + (remaining * (wc / total_words)) for wc in word_counts]
        else:
            durations = [(total_duration * (wc / total_words)) for wc in word_counts]

        entries = []
        cursor = start
        for i, caption in enumerate(captions):
            if i == len(captions) - 1:
                entry_end = end
            else:
                entry_end = cursor + durations[i]
            entries.append({
                "start": cursor,
                "end": entry_end,
                "text": caption
            })
            cursor = entry_end
        return entries

    def _wrap_text(self, text: str, max_chars: int):
        words = [w for w in text.replace("\n", " ").split(" ") if w]
        lines = []
        current = ""
        for word in words:
            if len(word) > max_chars:
                if current:
                    lines.append(current)
                    current = ""
                for i in range(0, len(word), max_chars):
                    lines.append(word[i:i + max_chars])
                continue
            candidate = f"{current} {word}".strip() if current else word
            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines

    def _parse_time_range(self, line: str):
        try:
            start, end = [s.strip() for s in line.split("-->")]
            return self._parse_time(start), self._parse_time(end)
        except:
            return None, None

    def _parse_time(self, value: str) -> float:
        hh, mm, rest = value.split(":")
        ss, ms = rest.split(",")
        return int(hh) * 3600 + int(mm) * 60 + int(ss) + int(ms) / 1000.0

    def _format_time(self, seconds: float) -> str:
        if seconds < 0:
            seconds = 0
        total = int(seconds)
        ms = int(round((seconds - total) * 1000))
        if ms == 1000:
            total += 1
            ms = 0
        hh = total // 3600
        mm = (total % 3600) // 60
        ss = total % 60
        return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"
