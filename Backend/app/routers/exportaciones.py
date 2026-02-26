from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import get_db
from app.models.usuario import Usuario, RolEnum
from app.routers.auth import get_current_user
from app.crud.exportaciones_crud import obtener_comuneros_para_exportacion

import io
import csv
import json
from datetime import datetime

router = APIRouter(prefix="/exportaciones", tags=["Exportaciones"])


def require_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != RolEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para exportar",
        )
    return usuario


@router.get("/comuneros")
def exportar_comuneros(
    formato: str = Query("csv", pattern="^(csv|json)$"),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),  # ✅ SOLO ADMIN
):
    rows = obtener_comuneros_para_exportacion(db, include_deleted=include_deleted)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if formato == "json":
        payload = [
            {
                "id": r.id,
                "nombre": r.nombre,
                "documento": r.documento,
                "datos_dinamicos": r.datos_dinamicos or {},
                "creado_por": r.creado_por,
                "is_deleted": r.is_deleted,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="comuneros_{ts}.json"'},
        )

    # CSV
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        ["id", "nombre", "documento", "creado_por", "is_deleted", "created_at", "updated_at", "datos_dinamicos"]
    )

    for r in rows:
        writer.writerow(
            [
                r.id,
                r.nombre,
                r.documento,
                r.creado_por,
                r.is_deleted,
                r.created_at.isoformat() if r.created_at else "",
                r.updated_at.isoformat() if r.updated_at else "",
                json.dumps(r.datos_dinamicos or {}, ensure_ascii=False),
            ]
        )

    data = output.getvalue().encode("utf-8-sig")  # BOM para Excel
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="comuneros_{ts}.csv"'},
    )