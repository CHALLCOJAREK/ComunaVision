import os
import re
import base64
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

from .ocr_engine import hybrid_ocr
from .gemini_normalizer import normalize_with_gemini

# -------------------------------------------------
# 🔹 LOAD ENV
# -------------------------------------------------
load_dotenv("backend/.env")

USE_GEMINI_ALWAYS = os.getenv("USE_GEMINI_ALWAYS", "1").strip() == "1"
FALLBACK_MIN_CONF = float(os.getenv("FALLBACK_MIN_CONF", "0.60"))
FALLBACK_MIN_TEXT_LEN = int(os.getenv("FALLBACK_MIN_TEXT_LEN", "80"))

# -------------------------------------------------
# 🔹 STORAGE
# -------------------------------------------------
STORAGE_DIR = Path("storage/images")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="OCR Identity PoC", version="1.0.0")


# -------------------------------------------------
# 🔹 REQUEST MODEL
# -------------------------------------------------
class ScanRequest(BaseModel):
    image: str
    use_gemini: Optional[bool] = None
    doc_hint: Optional[str] = None


# -------------------------------------------------
# 🔹 UTILS
# -------------------------------------------------
def _strip_dataurl(data: str) -> str:
    m = re.match(r"^data:.*?;base64,(.*)$", data, flags=re.IGNORECASE | re.DOTALL)
    return m.group(1) if m else data


def _save_temp_image(b64: str) -> str:
    raw = base64.b64decode(b64)
    fname = f"tmp_{uuid.uuid4().hex}.jpg"
    fpath = STORAGE_DIR / fname
    fpath.write_bytes(raw)
    return str(fpath)


def _should_use_gemini(conf: float, raw_len: int) -> bool:
    if USE_GEMINI_ALWAYS:
        return True
    if conf < FALLBACK_MIN_CONF:
        return True
    if raw_len < FALLBACK_MIN_TEXT_LEN:
        return True
    return False


# -------------------------------------------------
# 🔹 HEALTH
# -------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------------------------------
# 🔹 MAIN SCAN ENDPOINT
# -------------------------------------------------
@app.post("/scan")
def scan(req: ScanRequest) -> Dict[str, Any]:

    # 1️⃣ decode + save image
    b64 = _strip_dataurl(req.image)
    img_path = _save_temp_image(b64)

    # 2️⃣ OCR híbrido
    raw_text, confidence = hybrid_ocr(img_path)

    # 3️⃣ decidir uso Gemini
    use_g = req.use_gemini if req.use_gemini is not None else _should_use_gemini(
        confidence, len(raw_text)
    )

    out: Dict[str, Any] = {
        "ok": True,
        "image_path": img_path,
        "ocr_confidence_global": confidence,
        "ocr_raw": raw_text,
        "ocr_meta": {
            "raw_length": len(raw_text)
        },
        "gemini_used": False,
        "result": None,
        "warnings": []
    }

    # 4️⃣ Gemini normalization
    if use_g:
        try:
            normalized = normalize_with_gemini(raw_text, confidence)

            out["gemini_used"] = True
            out["result"] = normalized

        except Exception as e:
            out["warnings"].append(f"GeminiError: {str(e)}")

            out["result"] = {
                "document_type": "OTHER_ID",
                "warnings": ["Gemini no disponible; usando OCR crudo"],
                "raw_text": raw_text
            }

    else:
        out["result"] = {
            "document_type": "OCR_ONLY",
            "raw_text": raw_text
        }

    return out