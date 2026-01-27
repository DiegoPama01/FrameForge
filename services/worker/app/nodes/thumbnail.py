import os
import json
import base64
from pathlib import Path
from typing import Dict, Any
from .base import BaseNode

try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    OpenAI = None
    AsyncOpenAI = None

class ThumbnailNode(BaseNode):
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        meta_path = project_path / "meta.json"
        txt_path = project_path / "text" / "story_translated.txt"
        if not txt_path.exists():
            txt_path = project_path / "text" / "story.txt"
        
        if not txt_path.exists() or not meta_path.exists():
            await self.log(project_path.name, "Thumbnail failed: No text/meta found", "error")
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
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            story_text = txt_path.read_text(encoding="utf-8")
            story_title = meta.get("title_es", meta.get("title", ""))

            # Phase 1: Generate Visual Prompt
            await self.log(project_path.name, "Generating visual prompt...")
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

            prompt_resp = await client.chat.completions.create(
                model="gpt-5-mini",
                messages=[
                    {"role": "system", "content": designer_system_prompt},
                    {"role": "user", "content": designer_user_msg}
                ]
            )
            visual_prompt = prompt_resp.choices[0].message.content.strip()
            
            # Phase 2: Generate Image
            await self.log(project_path.name, "Generating thumbnail with gpt-image-1...")
            
            result = await client.images.generate(
                model="gpt-image-1",
                prompt=visual_prompt,
                size="1536x1024",
                quality="high",
                response_format="b64_json",
                extra_body={
                    "output_format": "png"
                }
            )
            
            if result.data and result.data[0].b64_json:
                image_bytes = base64.b64decode(result.data[0].b64_json)
                dst_img = project_path / "thumbnail.png"
                with open(dst_img, "wb") as f:
                    f.write(image_bytes)
                await self.log(project_path.name, "Thumbnail saved successfully", "success")
                return True
            else:
                await self.log(project_path.name, "Error: No image data returned", "error")
                return False

        except Exception as e:
            await self.log(project_path.name, f"Thumbnail Error: {e}", "error")
            return False
