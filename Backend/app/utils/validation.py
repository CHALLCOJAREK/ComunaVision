from __future__ import annotations

from datetime import datetime, date
from typing import Any, Dict, Iterable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.campos_formulario import CampoFormulario


def _is_empty(v: Any) -> bool:
    """Define 'vacío' para validación de obligatorios."""
    return v is None or v == "" or v == [] or v == {}  # simple y seguro


def _normalize_tipo(tipo: Any) -> str:
    return str(tipo or "").strip().lower()


def _get_select_values(opciones: Any) -> list[str]:
    """
    Soporta:
    - opciones = ["A","B"]
    - opciones = {"values": ["A","B"]}
    - opciones = {"opciones": ["A","B"]}  (por si lo guardaste así alguna vez)
    """
    if opciones is None:
        return []
    if isinstance(opciones, list):
        return [str(x) for x in opciones]
    if isinstance(opciones, dict):
        vals = opciones.get("values") or opciones.get("opciones") or []
        if isinstance(vals, list):
            return [str(x) for x in vals]
    return []


def _validate_type(key: str, tipo: str, value: Any, campo: CampoFormulario) -> None:
    # Permitir null si NO es obligatorio
    if value is None:
        if campo.obligatorio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El campo '{key}' es obligatorio",
            )
        return

    if tipo in {"string", "text"}:
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail=f"{key} debe ser texto")

    elif tipo in {"number", "float"}:
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise HTTPException(status_code=400, detail=f"{key} debe ser numérico")

    elif tipo in {"int", "integer"}:
        if not isinstance(value, int) or isinstance(value, bool):
            raise HTTPException(status_code=400, detail=f"{key} debe ser entero")

    elif tipo in {"boolean", "bool"}:
        if not isinstance(value, bool):
            raise HTTPException(status_code=400, detail=f"{key} debe ser booleano")

    elif tipo == "date":
        # acepta "YYYY-MM-DD" o date/datetime
        if isinstance(value, (date, datetime)):
            return
        if isinstance(value, str):
            try:
                datetime.strptime(value.strip(), "%Y-%m-%d")
                return
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=f"{key} debe ser fecha YYYY-MM-DD")

    elif tipo == "select":
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail=f"{key} debe ser texto (select)")
        allowed = _get_select_values(campo.opciones)
        if allowed and value not in allowed:
            raise HTTPException(status_code=400, detail=f"{key} contiene valor inválido")

    elif tipo == "multiselect":
        if not isinstance(value, list) or not all(isinstance(x, str) for x in value):
            raise HTTPException(status_code=400, detail=f"{key} debe ser lista de textos")
        allowed = _get_select_values(campo.opciones)
        if allowed:
            bad = [x for x in value if x not in allowed]
            if bad:
                raise HTTPException(status_code=400, detail=f"{key} contiene opciones inválidas")

    else:
        # tipo desconocido -> mejor bloquear, no aceptar basura silenciosa
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de campo no soportado: {key} ({tipo})",
        )


def validar_campos_dinamicos(db: Session, datos: Dict[str, Any] | None):
    datos = datos or {}

    campos = (
        db.query(CampoFormulario)
        .filter(CampoFormulario.activo == True)  # noqa: E712
        .all()
    )

    campos_config = {c.nombre_campo: c for c in campos}

    # 1) obligatorios: debe existir Y no estar vacío
    for nombre, campo in campos_config.items():
        if campo.obligatorio:
            if nombre not in datos or _is_empty(datos.get(nombre)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El campo '{nombre}' es obligatorio",
                )

    # 2) no permitir keys no configuradas
    for key in datos.keys():
        if key not in campos_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Campo no permitido: {key}",
            )

    # 3) validar tipos
    for key, value in datos.items():
        campo = campos_config[key]
        tipo = _normalize_tipo(campo.tipo)
        _validate_type(key, tipo, value, campo)