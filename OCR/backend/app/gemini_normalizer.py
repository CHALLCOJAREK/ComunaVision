# gemini_normalizer.py

import os
import json
import re
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai


# -------------------------------------------------
# 🔹 LOAD ENV (RUTA SEGURA)
# -------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv()  # carga desde raíz del proyecto

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY no encontrada en entorno")

genai.configure(api_key=GEMINI_API_KEY)


# -------------------------------------------------
# 🔹 ERROR PERSONALIZADO
# -------------------------------------------------
class GeminiError(Exception):
    pass


# -------------------------------------------------
# 🔹 EXTRAER JSON LIMPIO
# -------------------------------------------------
def extract_json(text: str):

    # quitar markdown wrappers
    text = re.sub(r"```json", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)

    # buscar primer bloque JSON válido
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        raise GeminiError("No JSON encontrado en respuesta Gemini")

    return match.group(0).strip()


# -------------------------------------------------
# 🔹 LLAMADA A GEMINI
# -------------------------------------------------
def call_gemini(prompt: str) -> str:

    try:
        model = genai.GenerativeModel(MODEL_NAME)

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0,
                "max_output_tokens": 2048
            }
        )

        if not response.text:
            raise GeminiError("Gemini devolvió respuesta vacía")

        return response.text

    except Exception as e:
        raise GeminiError(f"Error llamando a Gemini: {str(e)}")


# -------------------------------------------------
# 🔹 NORMALIZADOR PRINCIPAL
# -------------------------------------------------
def normalize_with_gemini(raw_text: str, confidence: float):

    prompt = f"""
Return ONLY valid JSON.
No markdown.
No explanations.

OCR TEXT:
{raw_text}

Schema:
{{
  "document_type": "",
  "country": "",
  "document_number": "",
  "passport_number": "",
  "given_names": "",
  "surnames": "",
  "full_name": "",
  "nationality": "",
  "date_of_birth": "",
  "gender": "",
  "place_of_birth": "",
  "issue_date": "",
  "expiry_date": "",
  "mrz": "",
  "address": "",
  "warnings": [],
  "confidence": {{
    "global": {confidence},
    "fields": {{}}
  }},
  "meta": {{
    "normalized_by": "gemini",
    "timestamp": "{datetime.utcnow().isoformat()}"
  }}
}}

Rules:
- country and nationality ISO-3
- dates YYYY-MM-DD
- gender only M, F, X
- detect DNI vs passport correctly
- separate document_number and passport_number
"""

    # 🔥 Retry automático (2 intentos)
    for attempt in range(2):
        try:
            raw_response = call_gemini(prompt)
            cleaned = extract_json(raw_response)
            parsed = json.loads(cleaned)
            return parsed

        except Exception as e:
            if attempt == 1:
                raise GeminiError(f"Gemini falló tras retry: {str(e)}")

    raise GeminiError("Gemini normalization failed")