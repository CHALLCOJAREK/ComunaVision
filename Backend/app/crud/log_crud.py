from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log_auditoria import LogAuditoria


# ===============================
# CREATE (Auditoría automática)
# ===============================
def registrar_log(
    db: Session,
    *,
    usuario_id: int,
    accion: str,              # "CREAR" | "EDITAR" | "ELIMINAR"
    entidad: str,             # "usuarios" | "comuneros" | "campos_formulario" | etc.
    entidad_id: int,
    datos_anteriores: Optional[dict[str, Any]] = None,
    datos_nuevos: Optional[dict[str, Any]] = None,
) -> LogAuditoria:
    log = LogAuditoria(
        usuario_id=usuario_id,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        datos_anteriores=datos_anteriores,
        datos_nuevos=datos_nuevos,
    )
    db.add(log)
    # OJO: no hacemos commit aquí por defecto para no romper transacciones del CRUD.
    # El commit lo hace el CRUD que llamó a esta función.
    return log


# ===============================
# LIST (con filtros + paginación)
# ===============================
def listar_logs(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    usuario_id: Optional[int] = None,
    entidad: Optional[str] = None,
    accion: Optional[str] = None,
    entidad_id: Optional[int] = None,
):
    q = select(LogAuditoria).order_by(LogAuditoria.timestamp.desc())

    if usuario_id is not None:
        q = q.where(LogAuditoria.usuario_id == usuario_id)
    if entidad:
        q = q.where(LogAuditoria.entidad == entidad)
    if accion:
        q = q.where(LogAuditoria.accion == accion)
    if entidad_id is not None:
        q = q.where(LogAuditoria.entidad_id == entidad_id)

    q = q.offset(skip).limit(limit)

    return db.execute(q).scalars().all()