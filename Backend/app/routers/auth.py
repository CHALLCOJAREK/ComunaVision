from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings, get_db
from app.models.usuario import Usuario, RolEnum
from app.crud.usuario_crud import obtener_usuario_por_email
from app.utils.security import verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ===============================
# TOKEN SCHEMA (local para no depender de otro archivo)
# ===============================
# Si prefieres, luego lo movemos a schemas (usuario_schema.py) como TokenSchema.
def _token_response(access_token: str) -> dict:
    return {"access_token": access_token, "token_type": "bearer"}


# ===============================
# CREATE TOKEN
# ===============================
def create_access_token(data: dict, expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ===============================
# LOGIN
# ===============================
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm usa "username" como campo, aquí lo usamos como email
    usuario = obtener_usuario_por_email(db, form_data.username)

    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    if not verify_password(form_data.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    access_token = create_access_token(
        data={
            "sub": str(usuario.id),
            "rol": usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
        }
    )

    return _token_response(access_token)


# ===============================
# CURRENT USER
# ===============================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario = db.get(Usuario, int(user_id))
    if not usuario or not usuario.activo:
        raise credentials_exception

    return usuario


# ===============================
# ME (TEST ACCESS)
# ===============================
@router.get("/me")
def me(usuario: Usuario = Depends(get_current_user)):
    return {
        "ok": True,
        "user_id": usuario.id,
        "email": usuario.email,
        "nombre": usuario.nombre,
        "rol": usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
        "activo": usuario.activo,
    }


# ===============================
# ROLE DEPENDENCY
# ===============================
def require_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    rol = usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol)
    if rol != RolEnum.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores",
        )
    return usuario

# ===============================
# ADMIN TEST (solo ADMIN)
# ===============================
@router.get("/admin/test")
def admin_test(usuario: Usuario = Depends(require_admin)):
    return {
        "ok": True,
        "msg": "Acceso admin concedido",
        "user_id": usuario.id,
        "rol": usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
    }