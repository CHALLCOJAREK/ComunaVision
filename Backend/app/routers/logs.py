from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import get_db
from app.crud.log_crud import listar_logs
from app.models.usuario import Usuario
from app.routers.auth import require_admin  # ✅ usa el require_admin central

router = APIRouter(prefix="/logs", tags=["Logs / Auditoría"])


@router.get("")
def get_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    usuario_id: Optional[int] = Query(None),
    entidad: Optional[str] = Query(None, description="Ej: usuarios, comuneros, campos_formulario"),
    accion: Optional[str] = Query(None, description="CREAR | EDITAR | ELIMINAR"),
    entidad_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),  # ✅ solo admin
):
    logs = listar_logs(
        db,
        skip=skip,
        limit=limit,
        usuario_id=usuario_id,
        entidad=entidad,
        accion=accion,
        entidad_id=entidad_id,
    )

    return [
        {
            "id": l.id,
            "usuario_id": l.usuario_id,
            "accion": l.accion,
            "entidad": l.entidad,
            "entidad_id": l.entidad_id,
            "datos_anteriores": l.datos_anteriores,
            "datos_nuevos": l.datos_nuevos,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]