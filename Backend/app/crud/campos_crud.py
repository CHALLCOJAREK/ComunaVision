from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.campos_formulario import CampoFormulario
from app.crud.log_crud import registrar_log


# -----------------------
# Helpers
# -----------------------
def _snap_campo(c: CampoFormulario) -> dict[str, Any]:
    return {
        "id": c.id,
        "nombre_campo": c.nombre_campo,
        "tipo": c.tipo,
        "obligatorio": c.obligatorio,
        "opciones": c.opciones,
        "activo": c.activo,
        # si tu modelo ya tiene created_at/updated_at/orden, se incluirán si existen
        "created_at": getattr(c, "created_at", None).isoformat() if getattr(c, "created_at", None) else None,
        "updated_at": getattr(c, "updated_at", None).isoformat() if getattr(c, "updated_at", None) else None,
        "orden": getattr(c, "orden", None),
    }


# -----------------------
# CREATE
# -----------------------
def crear_campo(db: Session, data, usuario_actual):
    nuevo = CampoFormulario(**data.model_dump())

    db.add(nuevo)
    db.flush()

    registrar_log(
        db,
        usuario_id=usuario_actual.id,
        accion="CREAR",
        entidad="campos_formulario",
        entidad_id=nuevo.id,
        datos_anteriores=None,
        datos_nuevos=_snap_campo(nuevo),
    )

    db.commit()
    db.refresh(nuevo)
    return nuevo


# -----------------------
# READ
# -----------------------
def listar_campos(db: Session):
    return db.execute(select(CampoFormulario)).scalars().all()


# -----------------------
# UPDATE
# -----------------------
def actualizar_campo(db: Session, campo: CampoFormulario, data, usuario_actual):
    antes = _snap_campo(campo)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(campo, key, value)

    db.flush()

    registrar_log(
        db,
        usuario_id=usuario_actual.id,
        accion="EDITAR",
        entidad="campos_formulario",
        entidad_id=campo.id,
        datos_anteriores=antes,
        datos_nuevos=_snap_campo(campo),
    )

    db.commit()
    db.refresh(campo)
    return campo


# -----------------------
# DELETE (soft = desactivar)
# -----------------------
def eliminar_campo(db: Session, campo: CampoFormulario, usuario_actual):
    antes = _snap_campo(campo)

    campo.activo = False
    db.flush()

    registrar_log(
        db,
        usuario_id=usuario_actual.id,
        accion="ELIMINAR",
        entidad="campos_formulario",
        entidad_id=campo.id,
        datos_anteriores=antes,
        datos_nuevos=_snap_campo(campo),
    )

    db.commit()