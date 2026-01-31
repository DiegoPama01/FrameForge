import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.orm import Session

from ..database import ProjectModel, TemplateModel

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
ASSETS_ROOT = DATA_ROOT / "assets"

PLACEHOLDER_REGEX = r"{{\s*([\w.-]+)\s*}}"
FONT_CACHE: Dict[str, Optional[str]] = {}


def _build_placeholder_values(meta: Dict[str, Any], project: ProjectModel) -> Dict[str, str]:
    values: Dict[str, str] = {}
    values["title"] = meta.get("title") or project.title or project.id
    values["project_id"] = project.id
    if project.author:
        values["author"] = project.author
    if project.subreddit:
        values["subreddit"] = project.subreddit
    for key, value in (meta or {}).items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            values[str(key)] = str(value)
    return values


def _resolve_placeholders(text: str, values: Dict[str, str]) -> str:
    if not text:
        return ""

    def repl(match):
        key = match.group(1)
        return values.get(key, "")

    return re.sub(PLACEHOLDER_REGEX, repl, text)


def _find_font_path(font_name: str) -> Optional[str]:
    if not font_name:
        return None
    key = font_name.lower()
    if key in FONT_CACHE:
        return FONT_CACHE[key]
    search_dirs = ["/usr/share/fonts", "/usr/local/share/fonts"]
    for root_dir in search_dirs:
        if not os.path.isdir(root_dir):
            continue
        for root, _, files in os.walk(root_dir):
            for file in files:
                if not file.lower().endswith((".ttf", ".otf")):
                    continue
                if key in file.lower():
                    path = os.path.join(root, file)
                    FONT_CACHE[key] = path
                    return path
    FONT_CACHE[key] = None
    return None


def _load_font(font_name: str, size: int) -> ImageFont.FreeTypeFont:
    path = _find_font_path(font_name)
    if path:
        try:
            return ImageFont.truetype(path, size=size)
        except Exception:
            pass
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size=size)
    except Exception:
        return ImageFont.load_default()


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
    if not text:
        return []
    lines: List[str] = []
    for paragraph in text.splitlines() or [""]:
        words = paragraph.split(" ")
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            bbox = draw.textbbox((0, 0), candidate, font=font)
            if bbox and (bbox[2] - bbox[0]) <= max_width:
                current = candidate
                continue
            if current:
                lines.append(current)
            current = word
        if current:
            lines.append(current)
        if paragraph == "":
            lines.append("")
    return lines


def _fit_text(draw: ImageDraw.ImageDraw, text: str, font_name: str, max_width: int, max_height: int, base_size: int, min_size: int = 10) -> Tuple[ImageFont.FreeTypeFont, List[str]]:
    size = max(base_size, min_size)
    while size >= min_size:
        font = _load_font(font_name, size)
        lines = _wrap_text(draw, text, font, max_width)
        if not lines:
            return font, []
        line_height = font.getbbox("Ag")[3] - font.getbbox("Ag")[1]
        total_height = int(line_height * len(lines) * 1.1)
        if total_height <= max_height:
            return font, lines
        size -= 2
    font = _load_font(font_name, min_size)
    return font, _wrap_text(draw, text, font, max_width)


def _parse_color(value: str, default=(255, 255, 255)) -> tuple:
    if not value:
        return default
    v = value.strip()
    if v.startswith("#") and len(v) in (4, 7):
        if len(v) == 4:
            r = int(v[1] * 2, 16)
            g = int(v[2] * 2, 16)
            b = int(v[3] * 2, 16)
            return (r, g, b)
        return (int(v[1:3], 16), int(v[3:5], 16), int(v[5:7], 16))
    return default


def _draw_text_with_shadow(
    draw: ImageDraw.ImageDraw,
    position: tuple,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple,
    shadow: str,
    stroke_width: int = 0,
    stroke_fill: Optional[tuple] = None
):
    if shadow == "none":
        draw.text(position, text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)
        return
    shadow_color = (0, 0, 0, 180)
    offsets = [(1, 1)]
    if shadow == "strong":
        offsets = [(2, 2), (2, 0), (0, 2)]
    for dx, dy in offsets:
        draw.text((position[0] + dx, position[1] + dy), text, font=font, fill=shadow_color)
    draw.text(position, text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)


def _extract_video_frame(video_path: Path, output_path: Path, width: int, height: int) -> bool:
    cmd = [
        "ffmpeg",
        "-y",
        "-ss", "1",
        "-i", str(video_path),
        "-vframes", "1",
        "-vf", f"scale={width}:{height}",
        str(output_path)
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.returncode == 0 and output_path.exists()


def _preview_dimensions(preview_aspect: str) -> Tuple[int, int]:
    if preview_aspect == "9:16":
        return 720, 1280
    return 1280, 720


def _resolve_crop(width: int, height: int, preview_aspect: str) -> Tuple[int, int, int, int]:
    target_ar = 16 / 9
    if preview_aspect == "9:16":
        target_ar = 9 / 16
    elif preview_aspect == "image":
        target_ar = width / height if height else target_ar

    image_ar = width / height if height else 1.0
    if image_ar > target_ar:
        crop_h = height
        crop_w = int(height * target_ar)
        crop_x = max(0, (width - crop_w) // 2)
        crop_y = 0
    elif image_ar < target_ar:
        crop_w = width
        crop_h = int(width / target_ar)
        crop_x = 0
        crop_y = max(0, (height - crop_h) // 2)
    else:
        crop_x = 0
        crop_y = 0
        crop_w = width
        crop_h = height
    return crop_x, crop_y, crop_w, crop_h


def render_template_preview(
    template_path: Path,
    fields: List[Dict[str, Any]],
    field_values: Dict[str, str],
    placeholder_values: Dict[str, str],
    preview_aspect: str,
    output_path: Path,
    overlay_path: Optional[Path] = None,
    background_video: Optional[Path] = None
):
    if not template_path.exists():
        raise FileNotFoundError("Template image not found")

    overlay = Image.open(template_path).convert("RGBA")
    draw = ImageDraw.Draw(overlay)

    width, height = overlay.size
    crop_x, crop_y, crop_w, crop_h = _resolve_crop(width, height, preview_aspect)

    for field in fields:
        try:
            if field.get("preview") is False:
                continue
            field_id = field.get("id")
            text = str(field_values.get(field_id, "")) if field_id else ""
            if not text:
                text = str(field.get("name") or "")
            text = _resolve_placeholders(text, placeholder_values)
            if not text:
                continue
            x = int(float(field.get("x", 0)) * width)
            y = int(float(field.get("y", 0)) * height)
            w = int(float(field.get("width", 0)) * width)
            h = int(float(field.get("height", 0)) * height)
            if w <= 0 or h <= 0:
                continue
            padding = 4
            box_x = x + padding
            box_y = y + padding
            box_w = max(0, w - padding * 2)
            box_h = max(0, h - padding * 2)
            if box_w <= 0 or box_h <= 0:
                continue
            font_name = field.get("font") or "DejaVuSans"
            size = int(field.get("size") or 32)
            color = _parse_color(field.get("color"), (255, 255, 255))
            shadow = field.get("shadow") or "soft"
            align = field.get("align") or "left"
            auto_fit = bool(field.get("autoFit"))
            stroke_width = int(field.get("strokeWidth") or 0)
            stroke_color = _parse_color(field.get("strokeColor"), (0, 0, 0))

            if auto_fit:
                font, lines = _fit_text(draw, text, font_name, box_w, box_h, size)
            else:
                font = _load_font(font_name, size)
                lines = _wrap_text(draw, text, font, box_w)

            if not lines:
                continue
            line_height = font.getbbox("Ag")[3] - font.getbbox("Ag")[1]
            start_y = box_y

            for idx, line in enumerate(lines):
                if line == "":
                    continue
                bbox = draw.textbbox((0, 0), line, font=font)
                line_width = bbox[2] - bbox[0]
                if align == "center":
                    text_x = box_x + (box_w - line_width) // 2
                elif align == "right":
                    text_x = box_x + (box_w - line_width)
                else:
                    text_x = box_x
                text_y = start_y + int(idx * line_height * 1.1)
                _draw_text_with_shadow(draw, (text_x, text_y), line, font, color, shadow, stroke_width, stroke_color)
        except Exception:
            continue

    output_path.parent.mkdir(parents=True, exist_ok=True)

    if preview_aspect != "image":
        overlay = overlay.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h))

    if overlay_path:
        overlay_path.parent.mkdir(parents=True, exist_ok=True)
        overlay.save(overlay_path, format="PNG")

    if background_video and background_video.exists():
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        if _extract_video_frame(background_video, tmp_path, width, height):
            base = Image.open(tmp_path).convert("RGBA")
            if preview_aspect != "image":
                base = base.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h))
            merged = Image.alpha_composite(base, overlay)
            merged.save(output_path, format="PNG")
            try:
                tmp_path.unlink()
            except Exception:
                pass
            return

    overlay.save(output_path, format="PNG")


def generate_preview_for_project(project: ProjectModel, db: Session, project_id: str, preview_type: str) -> None:
    meta = json.loads(project.meta_json or "{}")
    config_key = "intro_config" if preview_type == "intro" else "outro_config"
    config = meta.get(config_key) or {}
    mode = config.get("mode", "compose")
    output_path = DATA_ROOT / "projects" / project_id / "video" / "parts" / f"{preview_type}_preview.png"

    preview_aspect = config.get("previewAspect", "16:9")
    if mode == "video":
        video_path = config.get("video")
        if not video_path:
            return
        src = ASSETS_ROOT / video_path
        if not src.exists():
            return
        output_path.parent.mkdir(parents=True, exist_ok=True)
        width, height = _preview_dimensions(preview_aspect)
        _extract_video_frame(src, output_path, width, height)
        return

    template_id = config.get("templateId")
    if not template_id:
        if config.get("video"):
            src = ASSETS_ROOT / config.get("video")
            if src.exists():
                output_path.parent.mkdir(parents=True, exist_ok=True)
                width, height = _preview_dimensions(preview_aspect)
                _extract_video_frame(src, output_path, width, height)
        return
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()
    if not template:
        return

    placeholder_values = _build_placeholder_values(meta, project)
    background_video = None
    if config.get("video"):
        candidate = ASSETS_ROOT / config.get("video")
        if candidate.exists():
            background_video = candidate

    field_values = config.get("templateFields") or {}
    if config.get("text"):
        for key in ("text", "overlay", "overlay_text"):
            field_values.setdefault(key, str(config.get("text")))

    overlay_path = DATA_ROOT / "projects" / project_id / "video" / "parts" / f"{preview_type}_overlay.png"
    render_template_preview(
        ASSETS_ROOT / template.image_path,
        json.loads(template.fields_json or "[]"),
        field_values,
        placeholder_values,
        preview_aspect,
        output_path,
        overlay_path,
        background_video
    )


def render_preview_bytes(
    image_path: str,
    fields: List[Dict[str, Any]],
    field_values: Dict[str, str],
    preview_aspect: str
) -> bytes:
    template_path = ASSETS_ROOT / image_path
    placeholder_values = field_values or {}
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    render_template_preview(
        template_path,
        fields,
        field_values,
        placeholder_values,
        preview_aspect,
        tmp_path,
        None,
        None
    )
    data = tmp_path.read_bytes()
    try:
        tmp_path.unlink()
    except Exception:
        pass
    return data
