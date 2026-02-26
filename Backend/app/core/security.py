from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user  # ajusta el path si tu función está en otro archivo
from app.models.usuario import Usuario, RolEnum


def require_roles(*allowed_roles: RolEnum):
    def _guard(user: Usuario = Depends(get_current_user)) -> Usuario:
        if not user.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo",
            )

        if user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return user

    return _guard