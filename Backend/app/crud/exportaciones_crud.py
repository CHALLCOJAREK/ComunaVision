from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.comunero import Comunero


def obtener_comuneros_para_exportacion(db: Session, include_deleted: bool = False):
    q = select(Comunero)
    if not include_deleted:
        q = q.where(Comunero.is_deleted.is_(False))
    return db.execute(q).scalars().all()