# app/utils/security.py
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings, get_db
from app.models.usuario import Usuario, RolEnum

# ============================================================
# Password hashing (bcrypt)
# ============================================================
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

# OAuth2 Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# -----------------------
# Password
# -----------------------
def _ensure_bcrypt_password_limit(password: str) -> None:
    """
    bcrypt solo acepta 72 bytes. Si te pasas, puede truncar o fallar.
    Mejor fallar explícitamente con 400 para evitar comportamientos raros.
    """
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña excede el límite de 72 bytes (bcrypt).",
        )


def hash_password(password: str) -> str:
    _ensure_bcrypt_password_limit(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Ojo: si el password supera 72 bytes, bcrypt no garantiza verificación correcta.
    # Acá devolvemos False (o podrías lanzar 400 si prefieres).
    if len(plain_password.encode("utf-8")) > 72:
        return False
    return pwd_context.verify(plain_password, hashed_password)


# ============================================================
# JWT
# ============================================================
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    data: payload base (ej: {"sub": "123", "rol": "ADMIN"})
    Nota: sub recomendado como string.
    """
    to_encode = dict(data)

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


# ============================================================
# Current User
# ============================================================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    payload = decode_token(token)

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    # sub suele venir como string. Lo convertimos.
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user = db.get(Usuario, user_id)

    if not user or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no válido",
        )

    return user


# ============================================================
# Role validation
# ============================================================
def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.rol != RolEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores",
        )
    return current_user