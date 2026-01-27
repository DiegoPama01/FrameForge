import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from .base import BaseNode

# Using OpenAI for Translation
try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    OpenAI = None
    AsyncOpenAI = None

class TranslationNode(BaseNode):
    async def execute(self, project_path: Path, context: Dict[str, Any]) -> bool:
        meta_path = project_path / "meta.json"
        src_path = project_path / "text" / "story.txt"
        dst_path = project_path / "text" / "story_translated.txt"
        
        if not src_path.exists() or not meta_path.exists():
            await self.log(project_path.name, "Missing files for translation", "error")
            return False
            
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            original_text = src_path.read_text(encoding="utf-8")
            original_title = meta.get("title", "")
            
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key: 
                await self.log(project_path.name, "Missing OPENAI_API_KEY", "error")
                return False
            if not AsyncOpenAI: 
                await self.log(project_path.name, "OpenAI library not installed", "error")
                return False

            client = AsyncOpenAI(api_key=api_key)
            
            prompt = f"""Devuelve SOLO JSON válido con esta forma exacta:
{{
  "narrator_gender": "male" | "female" | "unknown",
  "translation_es": "...",
  "title_es": "..."
}}

Instrucciones estrictas:
1) narrator_gender: Determina el género del NARRADOR.
2) translation_es: Traduce al español natural, fluido y neutro. Optimiza para TTS.
3) Optimización: Frases claras, respirables, ritmo natural.
4) Estilo: Español estándar, sin emojis.
Salida: SOLO el JSON.

Story Title: {original_title}
Story Body:
{original_text}
"""
            await self.log(project_path.name, "Sending request to OpenAI for translation...")
            
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
            
            await self.log(project_path.name, "Translation completed successfully", "success")
            return True
        except Exception as e:
            await self.log(project_path.name, f"Translation Error: {e}", "error")
            return False
