from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.utils.security import hash_password
from app.crud.log_crud import registrar_log


# -----------------------
# Helpers
# -----------------------
def _snap_usuario(u: Usuario) -> dict[str, Any]:
    return {
        "id": u.id,
        "email": u.email,
        "nombre": u.nombre,
        "rol": u.rol.value if hasattr(u.rol, "value") else str(u.rol),
        "activo": u.activo,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
    }


# -----------------------
# CREATE
# -----------------------
def crear_usuario(db: Session, data, usuario_actual):
    existing = db.execute(
        select(Usuario).where(Usuario.email == data.email)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )

    nuevo = Usuario(
        email=data.email,
        nombre=data.nombre,
        hashed_password=hash_password(data.password),
        rol=data.rol,
        activo=True,
    )

    db.add(nuevo)
    db.flush()  # obtiene nuevo.id sin commit

    registrar_log(
        db,
        usuario_id=usuario_actual.id,
        accion="CREAR",
        entidad="usuarios",
        entidad_id=nuevo.id,
        datos_anteriores=None,
        datos_nuevos=_snap_usuario(nuevo),
    )

    db.commit()
    db.refresh(nuevo)
    return nuevo


# -----------------------
# READ
# -----------------------
def obtener_usuario_por_email(db: Session, email: str) -> Optional[Usuario]:
    return db.execute(
        select(Usuario).where(Usuario.email == email)
    ).scalar_one_or_none()


def obtener_usuario(db: Session, user_id: int) -> Optional[Usuario]:
    return db.get(Usuario, user_id)


def listar_usuarios(db: Session, skip: int = 0, limit: int = 20):
    query = select(Usuario).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


# -----------------------
# UPDATE
# -----------------------
def actualizar_usuario(db: Session, usuario: Usuario, data, usuario_actual):
    antes = _snap_usuario(usuario)

    # updates parciales
    if getattr(data, "nombre", None) is not None:
        usuario.nombre = data.nombre

    if getattr(data, "rol", None) is not None:
        usuario.rol = data.rol

    # opcional: cambio de password si existe en schema
    if getattr(data, "password", None):
        usuario.hashed_password = hash_password(data.password)

    db.flush()

    registrar_log(
        db,
        usuario_id=usuario_actual.id,
        accion="EDITAR",
        entidad="usuarios",
        entidad_id=usuario.id,
        datos_anteriores=antes,
        datos_nuevos=_snap_usuario(usuario),
    )

    db.commit()
    db.refresh(usuario)
    return usuario


# -----------------------
# DELETE (soft = desactivar)
# -----------------------
def eliminar_usuario(db: Session, usuario: Usuario, usuario_actual):
    antes = _snap_usuario(usuario)

    usuario.activo = False
    db.flush()

    registrar_log(
        db,
        usuario_id=usuario_actual.id,
        accion="ELIMINAR",
        entidad="usuarios",
        entidad_id=usuario.id,
        datos_anteriores=antes,
        datos_nuevos=_snap_usuario(usuario),
    )

    db.commit()