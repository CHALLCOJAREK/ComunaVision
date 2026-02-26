# app/routers/comuneros.py
from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import get_db
from app.models.comunero import Comunero
from app.schemas.comunero_schema import (
    ComuneroCreate,
    ComuneroUpdate,
    ComuneroResponse,
)
from app.crud.comunero_crud import (
    crear_comunero,
    listar_comuneros,
    actualizar_comunero,
    eliminar_comunero,
)
from app.routers.auth import get_current_user
from app.models.usuario import Usuario, RolEnum

router = APIRouter(prefix="/comuneros", tags=["Comuneros"])


# ===============================
# CREATE
# ===============================
@router.post("", response_model=ComuneroResponse, status_code=status.HTTP_201_CREATED)
def create_comunero(
    payload: ComuneroCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # admin y operador pueden crear
    return crear_comunero(db, payload, current_user)


# ===============================
# LIST + FILTERS + PAGINATION
# ===============================
@router.get("", response_model=list[ComuneroResponse])
def list_comuneros(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    # ✅ Swagger-friendly: recibe JSON como string y lo parseamos a dict
    filtros_and: Optional[str] = Query(
        None,
        description='JSON string. Ej: {"zona":"A","sexo":"M"}',
    ),
    filtros_or: Optional[str] = Query(
        None,
        description='JSON string. Ej: {"estado":["activo","pendiente"]}',
    ),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # admin y operador pueden listar

    try:
        filtros_and_dict: Optional[Dict[str, Any]] = json.loads(filtros_and) if filtros_and else None
        filtros_or_dict: Optional[Dict[str, Any]] = json.loads(filtros_or) if filtros_or else None
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="filtros_and/filtros_or deben ser JSON válido",
        )

    return listar_comuneros(
        db=db,
        skip=skip,
        limit=limit,
        filtros_and=filtros_and_dict,
        filtros_or=filtros_or_dict,
    )


# ===============================
# UPDATE
# ===============================
@router.put("/{comunero_id}", response_model=ComuneroResponse)
def update_comunero(
    comunero_id: int,
    payload: ComuneroUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    comunero = db.get(Comunero, comunero_id)
    if not comunero or comunero.is_deleted:
        raise HTTPException(status_code=404, detail="Comunero no encontrado")

    # admin y operador pueden editar
    # Nota: tu CRUD de update espera data completa en algunos puntos;
    # aquí forzamos "merge" para mantenerlo consistente.
    data = payload.model_dump(exclude_unset=True)

    # Si tu CRUD actual requiere nombre/documento/datos_dinamicos completos,
    # aquí los completamos con los valores actuales:
    if "nombre" not in data:
        data["nombre"] = comunero.nombre
    if "documento" not in data:
        data["documento"] = comunero.documento
    if "datos_dinamicos" not in data:
        data["datos_dinamicos"] = comunero.datos_dinamicos

    # Reusamos schema de create-like para mantener validación dinámica estable
    payload_full = ComuneroCreate(
        **{
            "nombre": data["nombre"],
            "documento": data["documento"],
            "datos_dinamicos": data["datos_dinamicos"],
        }
    )

    return actualizar_comunero(db, comunero, payload_full, current_user)


# ===============================
# DELETE (SOFT)
# ===============================
@router.delete("/{comunero_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comunero(
    comunero_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    comunero = db.get(Comunero, comunero_id)
    if not comunero or comunero.is_deleted:
        raise HTTPException(status_code=404, detail="Comunero no encontrado")

    # conservador: solo admin elimina
    rol = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    if rol != RolEnum.ADMIN.value:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar")

    eliminar_comunero(db, comunero, current_user)
    return None