# ocr_engine.py

import easyocr
import pytesseract
import cv2
import numpy as np
import re

import os
from dotenv import load_dotenv
import pytesseract

load_dotenv()

TESSERACT_CMD = os.getenv("TESSERACT_CMD")

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# Inicializar una sola vez
reader = easyocr.Reader(['es', 'en'], gpu=False)


# -------------------------------------------------
# 🔹 PREPROCESAMIENTO INTELIGENTE
# -------------------------------------------------
def preprocess_image(image_path):
    img = cv2.imread(image_path)

    # Escalar imagen (mejora OCR en DNI)
    scale_percent = 150
    width = int(img.shape[1] * scale_percent / 100)
    height = int(img.shape[0] * scale_percent / 100)
    img = cv2.resize(img, (width, height), interpolation=cv2.INTER_LINEAR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Mejorar contraste
    gray = cv2.equalizeHist(gray)

    # Reducir ruido
    gray = cv2.medianBlur(gray, 3)

    # Binarización adaptativa (clave para DNI)
    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2
    )

    return thresh


# -------------------------------------------------
# 🔹 LIMPIEZA DE TEXTO
# -------------------------------------------------
def clean_text(text: str) -> str:

    # Mojibake fix
    try:
        text = text.encode("latin1").decode("utf-8")
    except:
        pass

    # Quitar símbolos raros
    text = re.sub(r"[^\x00-\x7F]+", " ", text)

    # Corregir errores comunes DNI
    text = text.replace("0oooooo4e3", "")
    text = text.replace("SIN VALOR", "")

    # Limpiar espacios múltiples
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# -------------------------------------------------
# 🔹 EASY OCR
# -------------------------------------------------
def run_easyocr(image_path):

    processed = preprocess_image(image_path)

    results = reader.readtext(processed)

    lines = []
    confidences = []

    for r in results:
        lines.append(r[1])
        confidences.append(r[2])

    text = "\n".join(lines)
    confidence = np.mean(confidences) if confidences else 0.0

    return text, float(confidence)


# -------------------------------------------------
# 🔹 TESSERACT
# -------------------------------------------------
def run_tesseract(image_path):

    processed = preprocess_image(image_path)

    custom_config = r'--oem 3 --psm 6'

    text = pytesseract.image_to_string(
        processed,
        lang="spa+eng",
        config=custom_config
    )

    return text


# -------------------------------------------------
# 🔹 OCR HÍBRIDO
# -------------------------------------------------
def hybrid_ocr(image_path):

    easy_text, easy_conf = run_easyocr(image_path)
    tess_text = run_tesseract(image_path)

    # Combinar inteligentemente
    combined = easy_text + "\n" + tess_text

    combined = clean_text(combined)

    # 🔥 Limitar tamaño (evita truncado Gemini)
    MAX_CHARS = 1800
    combined = combined[:MAX_CHARS]

    return combined, round(easy_conf, 4)