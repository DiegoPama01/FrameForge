import asyncio
import base64
import shutil
import re
import json
import os
import random
import httpx
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from ..database import ProjectModel, SessionLocal
from ..broadcaster import broadcaster

# Using OpenAI for Translation (High Quality)
try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    OpenAI = None
    AsyncOpenAI = None

# Using edge-tts for Speech (Free)
try:
    import edge_tts
except ImportError:
    edge_tts = None

DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data")).resolve()
PROJECTS_ROOT = DATA_ROOT / "projects"

STAGE_SEQUENCE = [
    'Text Scrapped', 
    'Text Translated', 
    'Speech Generated', 
    'Subtitles Created', 
    'Thumbnail Created'
]

async def execute_stage(project_id: str, stage: str):
    db = SessionLocal()
    try:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project: return
        
        p = PROJECTS_ROOT / project_id
        previous_stage = project.current_stage
        
        # Immediate feedback: show target stage and Processing status
        project.status = "Processing"
        project.current_stage = stage
        project.updated_at = datetime.utcnow()
        db.commit()

        # Update meta.json for instant UI feedback
        meta_path = p / "meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                meta["status"] = "Processing"
                meta["currentStage"] = stage
                meta_path.write_text(json.dumps(meta, indent=4))
            except: pass

        print(f"--- Executing pipeline stage '{stage}' for {project_id}")
        await broadcaster.broadcast("log", {"level": "info", "message": f"Starting stage '{stage}' for project {project_id}", "project_id": project_id})
        await broadcaster.broadcast("status_update", {"id": project_id, "status": "Processing", "currentStage": stage})
        
        success = False
        if stage == "Text Translated":
            success = await process_translation(p)
        elif stage == "Speech Generated":
            success = await process_tts(p)
        elif stage == "Subtitles Created":
            success = await process_subtitles(p)
        elif stage == "Thumbnail Created":
            success = await process_thumbnail(p)
            
        if success:
            project.status = "Success"
            print(f"--- Stage '{stage}' success")
            await broadcaster.broadcast("log", {"level": "success", "message": f"Stage '{stage}' completed successfully", "project_id": project_id})
            await broadcaster.broadcast("status_update", {"id": project_id, "status": "Success", "currentStage": stage})
        else:
            project.status = "Error"
            # Revert to previous stage on failure to allow retry
            project.current_stage = previous_stage
            print(f"--- Stage '{stage}' failed")
            await broadcaster.broadcast("log", {"level": "error", "message": f"Stage '{stage}' failed", "project_id": project_id})
            await broadcaster.broadcast("status_update", {"id": project_id, "status": "Error", "currentStage": previous_stage})
        
        project.updated_at = datetime.utcnow()
        db.commit()

        # Final sync filesystem metadata
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text())
                meta["status"] = project.status
                meta["currentStage"] = project.current_stage
                meta_path.write_text(json.dumps(meta, indent=4))
            except: pass

    except Exception as e:
        print(f"--- Critical error in stage {stage}: {e}")
        await broadcaster.broadcast("log", {"level": "error", "message": f"Critical error in stage {stage}: {str(e)}", "project_id": project_id})
        if project:
            try:
                project.status = "Error"
                project.updated_at = datetime.utcnow()
                db.commit()
            except: pass
    finally:
        db.close()

async def process_translation(project_path: Path):
    meta_path = project_path / "meta.json"
    src_path = project_path / "text" / "story.txt"
    dst_path = project_path / "text" / "story_translated.txt"
    
    if not src_path.exists() or not meta_path.exists():
        return False
        
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        original_text = src_path.read_text(encoding="utf-8")
        original_title = meta.get("title", "")
        
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key: return False
        if not AsyncOpenAI: return False

        client = AsyncOpenAI(api_key=api_key)
        
        prompt = f"""Devuelve SOLO JSON válido con esta forma exacta:
{{
  "narrator_gender": "male" | "female" | "unknown",
  "translation_es": "...",
  "title_es": "..."
}}

Instrucciones estrictas:

1) narrator_gender
- Determina el género del NARRADOR de la historia (no del autor).
- Usa "unknown" si no hay evidencia clara en el texto.
- No adivines.

2) translation_es
- Traduce el texto al español natural, fluido y neutro.
- Optimiza el texto para ser narrado en voz (TTS).
- Mantén el significado, los hechos y el tono original.
- No añadas ni elimines eventos, personajes o información.
- No resumas.

3) Optimización para narración
- Prefiere frases claras y respirables.
- Divide frases excesivamente largas si mejora la comprensión oral.
- Evita estructuras demasiado literarias que suenen mal en voz alta.
- Mantén un ritmo natural, con pausas implícitas.
- El texto debe poder leerse en voz alta sin tropezar.
- Que la narración enganche al lector

4) Estilo
- Español estándar, comprensible para España y LATAM.
- Sin muletillas modernas ni jerga.
- Sin emojis.
- Sin explicaciones ni comentarios.
- Evita cualquier caracter que una TTS no pueda decir. En caso de que el texto contenga emojis, eliminalos o cambialo pero manteniendo la consistencia de la historia.

Salida:
- SOLO el JSON.
- No uses markdown.
- No añadas texto fuera del JSON.

Story Title: {original_title}
Story Body:
{original_text}
"""
        
        response = await client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "You are a professional translator and narrator assistant."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        result_json = response.choices[0].message.content
        data = json.loads(result_json)
        
        dst_path.write_text(data["translation_es"], encoding="utf-8")
        meta["narrator_gender"] = data.get("narrator_gender", "unknown")
        meta["title_es"] = data.get("title_es", original_title)
        meta_path.write_text(json.dumps(meta, indent=4), encoding="utf-8")
        
        return True
    except Exception as e:
        print(f"--- Translation Error: {e}")
        return False

async def process_tts(project_path: Path):
    # Determine the input text file (prefer translated)
    txt_path = project_path / "text" / "story_translated.txt"
    if not txt_path.exists():
        txt_path = project_path / "text" / "story.txt"
    
    if not txt_path.exists():
        print(f"--- TTS failed: No text file found in {project_path}/text")
        return False
    
    out_dir = (project_path / "audio" / "source").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    combined_audio = out_dir / "full_audio.mp3"
    
    # Voice selection
    primary_voice = "es-ES-AlvaroNeural"
    fallback_voice = "es-MX-JorgeNeural"
    try:
        meta_path = project_path / "meta.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            gender = meta.get("narrator_gender", "unknown")
            if gender == "female":
                primary_voice = "es-ES-ElviraNeural"
                fallback_voice = "es-MX-DaliaNeural"
    except: pass
    
    print(f"--- Generating TTS using edge-tts CLI --file {txt_path.name}")
    
    # Available voices for rotation
    male_voices = ["es-ES-AlvaroNeural", "es-MX-JorgeNeural", "es-AR-TomasNeural"]
    female_voices = ["es-ES-ElviraNeural", "es-MX-DaliaNeural", "es-AR-ElenaNeural"]
    
    try:
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
            
            print(f"--- TTS Attempt {attempt+1}/{max_retries} with voice: {current_voice}")
            
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
                    print(f"--- TTS Success with {current_voice}")
                    success = True
                    
                    # Get audio duration using ffprobe
                    try:
                        duration_cmd = [
                            "ffprobe", "-v", "error",
                            "-show_entries", "format=duration",
                            "-of", "default=noprint_wrappers=1:nokey=1",
                            str(combined_audio)
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
                            
                            # Save duration to metadata
                            meta_path = project_path / "meta.json"
                            if meta_path.exists():
                                try:
                                    meta = json.loads(meta_path.read_text())
                                    meta["duration"] = duration_str
                                    meta_path.write_text(json.dumps(meta, indent=4))
                                    print(f"--- Audio duration: {duration_str}")
                                except Exception as e:
                                    print(f"--- Failed to save duration: {e}")
                    except Exception as e:
                        print(f"--- Failed to get audio duration: {e}")
                    
                    break
                else:
                    err_msg = stderr.decode()
                    print(f"--- TTS Attempt {attempt+1} failed (voice: {current_voice})")
                    print(f"--- Error output: {err_msg[:500]}")  # First 500 chars
                    
            except asyncio.TimeoutError:
                print(f"--- TTS Attempt {attempt+1} timed out after 5 minutes")
            except Exception as e:
                print(f"--- TTS Attempt {attempt+1} exception: {e}")
            
            # Exponential backoff with jitter if not last attempt
            if attempt < max_retries - 1:
                base_delay = 3 * (2 ** attempt)  # 3, 6, 12, 24 seconds
                jitter = random.uniform(0, 2)  # 0-2 seconds random
                delay = base_delay + jitter
                print(f"--- Waiting {delay:.1f}s before retry...")
                await asyncio.sleep(delay)
        
        if not success:
            print(f"--- TTS failed after {max_retries} attempts")
        
        return success
    except Exception as e:
        print(f"--- TTS CLI Error: {e}")
        return False

async def process_subtitles(project_path: Path):
    print("--- [DEBUG] Starting process_subtitles using OPENAI API")
    audio_path = project_path / "audio" / "source" / "full_audio.mp3"
    dst_path = project_path / "subtitles.srt"
    
    if not audio_path.exists():
        print(f"--- Subtitles failed: No audio at {audio_path}")
        return False
        
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key: return False
        if not AsyncOpenAI: return False

        client = AsyncOpenAI(api_key=api_key)
        
        print(f"--- Transcribing with Whisper API: {audio_path.name}")
        with open(audio_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="srt",
                language="es"
            )
        
        dst_path.write_text(response, encoding="utf-8")
        print(f"--- Subtitles created: {dst_path.name}")
        return True
    except Exception as e:
        print(f"--- Subtitles Error: {e}")
        return False

async def process_thumbnail(project_path: Path):
    meta_path = project_path / "meta.json"
    txt_path = project_path / "text" / "story_translated.txt"
    if not txt_path.exists():
        txt_path = project_path / "text" / "story.txt"
    
    if not txt_path.exists() or not meta_path.exists():
        return False
        
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key: return False
        if not AsyncOpenAI: return False

        client = AsyncOpenAI(api_key=api_key)
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        story_text = txt_path.read_text(encoding="utf-8")
        story_title = meta.get("title_es", meta.get("title", ""))

        # Phase 1: Generate Visual Prompt
        print("--- Generating visual prompt with OpenAI...")
        designer_system_prompt = """Eres un diseñador experto en thumbnails de YouTube para historias narradas.
Tu tarea es elegir UNA escena visual poderosa basada en la historia completa.

Reglas:
- No resumas la historia.
- Elige una escena que genere curiosidad inmediata.
- Debe funcionar incluso sin conocer la historia.
- Estilo cinematográfico, alto contraste.
- Máximo 3 frases.
- Tu prompt debe poder pasar los filtros de seguridad de DALL-E 3
- En caso de dudas sobre el prompt elige otro momento de la historia.
- La imagen final generada por dicho prompt será thumbnail de Youtube
Devuelve SOLO texto plano."""

        designer_user_msg = f"""Basado en esta historia, crea un prompt para gpt-image-1 siguiendo este estilo:

Thumbnail de horror viral,
estilo ilustración cinematográfica hiperrealista,

primer plano de [PERSONA PRINCIPAL],
expresión extrema de [EMOCIÓN PRINCIPAL],
ojos muy abiertos / sudor visible / boca entreabierta,
mirando hacia [DIRECCIÓN DEL PELIGRO],
iluminación principal [FRÍA / CÁLIDA] sobre el rostro,

detrás de [UBICACIÓN: puerta / mostrador / pasillo / ventana],
[ENTIDAD / PERSONA AMENAZANTE],
apariencia humana pero incorrecta,
sonrisa antinatural / postura imposible / ojos apagados,
parcialmente en sombras o ligeramente desenfocada,
sensación de que algo está muy mal,

iluminación dramática,
alto contraste,
sombras profundas,
atmósfera opresiva,
sensación de engaño, peligro inmediato y horror psicológico,

composición optimizada para YouTube thumbnail,
caras grandes,
encuadre cerrado,
fondo oscuro o simplificado sin distracciones,

texto grande en español:
"[PALABRA 1]" en blanco brillante,
"[PALABRA 2]" en rojo intenso o amarillo fuerte,
(opcional "[PALABRA 3]" en color secundario),
tipografía gruesa estilo YouTube thumbnail,
contorno negro muy marcado,
sombra fuerte para máxima legibilidad,
texto colocado en la parte [superior / inferior] sin tapar rostros,

calidad 4K,
ultra detallado,
sin desnudez,
sin gore explícito

Story Title: {story_title}
Story Body: {story_text}"""

        # Using the model already used in the project
        prompt_resp = await client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": designer_system_prompt},
                {"role": "user", "content": designer_user_msg}
            ]
        )
        visual_prompt = prompt_resp.choices[0].message.content.strip()
        print(f"--- Visual Prompt created: {visual_prompt[:100]}...")

        # Phase 2: Generate Image
        print("--- Generating thumbnail with gpt-image-1...")
        
        result = await client.images.generate(
            model="gpt-image-1",
            prompt=visual_prompt,
            size="1536x1024",
            extra_body={
                "output_format": "png"
            }
        )
        
        if result.data and result.data[0].b64_json:
            image_bytes = base64.b64decode(result.data[0].b64_json)
            dst_img = project_path / "thumbnail.png"
            with open(dst_img, "wb") as f:
                f.write(image_bytes)
            print(f"--- Thumbnail saved: {dst_img.name}")
            return True
        else:
            print("--- Error: No image data returned")
            return False

    except Exception as e:
        print(f"--- Thumbnail Error: {e}")
        return False
