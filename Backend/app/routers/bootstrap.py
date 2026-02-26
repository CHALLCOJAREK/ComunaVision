from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_db, settings
from app.models.usuario import Usuario, RolEnum
from app.utils.security import hash_password

router = APIRouter(prefix="/bootstrap", tags=["Bootstrap (DEV)"])


@router.post("/admin")
def crear_admin_inicial(
    email: str,
    nombre: str,
    password: str,
    db: Session = Depends(get_db),
):
    # ✅ SOLO DEV
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    email_norm = email.strip().lower()

    existing = db.execute(
        select(Usuario).where(Usuario.email == email_norm)
    ).scalar_one_or_none()

    if existing:
        return {"ok": True, "msg": "Ya existe", "user_id": existing.id}

    admin = Usuario(
        email=email_norm,
        nombre=nombre.strip(),
        hashed_password=hash_password(password),
        rol=RolEnum.ADMIN,
        activo=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {"ok": True, "msg": "Admin creado", "user_id": admin.id}