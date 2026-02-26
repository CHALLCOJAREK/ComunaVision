from datetime import datetime, timedelta, date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, cast, Date
from sqlalchemy.orm import Session

from app.config import get_db
from app.models.comunero import Comunero
from app.models.usuario import Usuario
from app.models.campos_formulario import CampoFormulario
from app.routers.auth import get_current_user
from app.models.usuario import Usuario as UsuarioModel  # para type clarity


router = APIRouter(prefix="/estadisticas", tags=["Estadísticas"])


@router.get("")
def dashboard_stats(
    campo_top: str = Query("zona", description="Campo dinámico JSONB para agrupar TOP (ej: zona, sexo, estado)"),
    days: int = Query(7, ge=1, le=90, description="Rango de días para la serie"),
    db: Session = Depends(get_db),
    current_user: UsuarioModel = Depends(get_current_user),
):
    # ===============================
    # Totales
    # ===============================
    total_comuneros = db.execute(
        select(func.count()).select_from(Comunero).where(Comunero.is_deleted == False)
    ).scalar_one()

    total_usuarios_activos = db.execute(
        select(func.count()).select_from(Usuario).where(Usuario.activo == True)
    ).scalar_one()

    total_campos_activos = db.execute(
        select(func.count()).select_from(CampoFormulario).where(CampoFormulario.activo == True)
    ).scalar_one()

    # ===============================
    # Nuevos hoy
    # ===============================
    hoy = datetime.utcnow().date()

    nuevos_hoy = db.execute(
        select(func.count()).select_from(Comunero).where(
            Comunero.is_deleted == False,
            cast(Comunero.created_at, Date) == hoy,
        )
    ).scalar_one()

    # ===============================
    # Serie últimos N días (diaria)
    # ===============================
    start_date = hoy - timedelta(days=days - 1)

    serie_rows = db.execute(
        select(
            cast(Comunero.created_at, Date).label("dia"),
            func.count().label("total"),
        )
        .where(
            Comunero.is_deleted == False,
            cast(Comunero.created_at, Date) >= start_date,
        )
        .group_by("dia")
        .order_by("dia")
    ).all()

    # Rellenar días faltantes (para gráficos bonitos)
    serie_map = {r.dia: int(r.total) for r in serie_rows}
    serie = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        serie.append({"date": d.isoformat(), "count": serie_map.get(d, 0)})

    # ===============================
    # TOP por campo dinámico JSONB
    # ===============================
    # Comunero.datos_dinamicos[campo].astext -> valor del JSON
    top_rows = db.execute(
        select(
            Comunero.datos_dinamicos[campo_top].astext.label("valor"),
            func.count().label("total"),
        )
        .where(
            Comunero.is_deleted == False,
            Comunero.datos_dinamicos.has_key(campo_top),  # type: ignore[attr-defined]
        )
        .group_by("valor")
        .order_by(func.count().desc())
        .limit(5)
    ).all()

    top = [{"value": (r.valor or "SIN_VALOR"), "count": int(r.total)} for r in top_rows]

    return {
        "totales": {
            "comuneros": int(total_comuneros),
            "usuarios_activos": int(total_usuarios_activos),
            "campos_activos": int(total_campos_activos),
        },
        "nuevos_hoy": int(nuevos_hoy),
        "serie": serie,
        "top_campo": {
            "campo": campo_top,
            "top5": top,
        },
    }