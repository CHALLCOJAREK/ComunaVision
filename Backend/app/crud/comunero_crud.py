from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.comunero import Comunero
from app.utils.validation import validar_campos_dinamicos
from app.crud.log_crud import registrar_log


# -----------------------
# Helpers
# -----------------------
def _snap_comunero(c: Comunero) -> dict[str, Any]:
    """Snapshot serializable para auditoría."""
    return {
        "id": c.id,
        "nombre": c.nombre,
        "documento": c.documento,
        "datos_dinamicos": c.datos_dinamicos or {},
        "creado_por": c.creado_por,
        "is_deleted": c.is_deleted,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


# -----------------------
# CREATE
# -----------------------
def crear_comunero(db: Session, data, usuario_actual):
    validar_campos_dinamicos(db, data.datos_dinamicos)

    nuevo = Comunero(
        nombre=data.nombre,
        documento=data.documento,
        datos_dinamicos=data.datos_dinamicos,
        creado_por=usuario_actual.id,
    )

    try:
        db.add(nuevo)
        db.flush()  # obtiene nuevo.id sin cerrar transacción

        registrar_log(
            db,
            usuario_id=usuario_actual.id,
            accion="CREAR",
            entidad="comuneros",
            entidad_id=nuevo.id,
            datos_anteriores=None,
            datos_nuevos=_snap_comunero(nuevo),
        )

        db.commit()
        db.refresh(nuevo)
        return nuevo

    except IntegrityError:
        db.rollback()
        raise  # 👈 lo maneja el handler global (409/400)


# -----------------------
# READ + FILTERS
# -----------------------
def listar_comuneros(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    filtros_and: Optional[dict] = None,
    filtros_or: Optional[dict] = None,
):
    query = select(Comunero).where(Comunero.is_deleted.is_(False))

    and_conditions = []
    if filtros_and:
        for key, value in filtros_and.items():
            and_conditions.append(Comunero.datos_dinamicos[key].astext == str(value))

    if and_conditions:
        query = query.where(and_(*and_conditions))

    if filtros_or:
        or_conditions = [
            Comunero.datos_dinamicos[key].astext == str(value)
            for key, value in filtros_or.items()
        ]
        query = query.where(or_(*or_conditions))

    query = query.offset(skip).limit(limit)
    return db.execute(query).scalars().all()


# -----------------------
# UPDATE
# -----------------------
def actualizar_comunero(db: Session, comunero: Comunero, data, usuario_actual):
    antes = _snap_comunero(comunero)

    validar_campos_dinamicos(db, data.datos_dinamicos)

    comunero.nombre = data.nombre
    comunero.documento = data.documento
    comunero.datos_dinamicos = data.datos_dinamicos

    try:
        db.flush()

        registrar_log(
            db,
            usuario_id=usuario_actual.id,
            accion="EDITAR",
            entidad="comuneros",
            entidad_id=comunero.id,
            datos_anteriores=antes,
            datos_nuevos=_snap_comunero(comunero),
        )

        db.commit()
        db.refresh(comunero)
        return comunero

    except IntegrityError:
        db.rollback()
        raise  # 👈 lo maneja el handler global


# -----------------------
# DELETE (SOFT)
# -----------------------
def eliminar_comunero(db: Session, comunero: Comunero, usuario_actual):
    antes = _snap_comunero(comunero)

    comunero.is_deleted = True

    try:
        db.flush()

        registrar_log(
            db,
            usuario_id=usuario_actual.id,
            accion="ELIMINAR",
            entidad="comuneros",
            entidad_id=comunero.id,
            datos_anteriores=antes,
            datos_nuevos=_snap_comunero(comunero),
        )

        db.commit()
        return {"ok": True}

    except IntegrityError:
        db.rollback()
        raise