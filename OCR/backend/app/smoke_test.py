import os
import json
import datetime
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

class GeminiError(RuntimeError):
    pass

def normalize_with_gemini(raw_text: str, doc_type: str = "DNI") -> dict:
    """
    Toma texto OCR crudo y lo devuelve como JSON estructurado según el schema definido.
    """
    if not GEMINI_API_KEY:
        raise GeminiError("Falta GEMINI_API_KEY en backend/.env")

    # Schema objetivo (ajústalo a tu gusto)
    schema = {
        "document_type": doc_type,
        "country": "PER",
        "document_number": "",
        "names": "",
        "surnames": "",
        "full_name": "",
        "date_of_birth": "",
        "gender": "",
        "nationality": "PER",
        "issue_date": "",
        "expiry_date": "",
        "address": "",
        "warnings": [],
    }

    system_rules = f"""
Eres un extractor y normalizador de datos a JSON.
Devuelve SOLO JSON válido, sin texto adicional, sin markdown.
Debes respetar exactamente las claves del schema.
Si un campo no se encuentra, deja cadena vacía.
Fechas en formato YYYY-MM-DD si es posible.
gender solo M o F (si no estás seguro, vacío).
document_number: solo dígitos.
Si hay ambigüedad, agrega una explicación corta en warnings.
"""

    prompt = f"""
SCHEMA (no cambies las claves): {json.dumps(schema, ensure_ascii=False)}

TEXTO_OCR:
{raw_text}
"""

    # Endpoint Gemini (REST). Si usas otro modelo, cambia model=
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    headers = {"Content-Type": "application/json"}

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": system_rules.strip() + "\n\n" + prompt.strip()}]}
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 800
        }
    }

    r = requests.post(url, params={"key": GEMINI_API_KEY}, headers=headers, json=payload, timeout=60)
    if r.status_code != 200:
        raise GeminiError(f"Gemini HTTP {r.status_code}: {r.text[:300]}")

    data = r.json()

    # Extraer el texto devuelto por Gemini
    try:
        text_out = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise GeminiError(f"Respuesta inesperada Gemini: {str(data)[:300]}")

    # Parsear JSON
    try:
        normalized = json.loads(text_out)
    except json.JSONDecodeError:
        raise GeminiError(f"Gemini no devolvió JSON válido. Output: {text_out[:300]}")

    # Enriquecimiento meta
    normalized["meta"] = {
        "normalized_by": "gemini",
        "timestamp": datetime.datetime.now().isoformat()
    }

    return normalized