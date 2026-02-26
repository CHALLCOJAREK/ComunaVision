from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_db
from app.models.campos_formulario import CampoFormulario
from app.schemas.campos_formulario_schema import (
    CampoFormularioCreate,
    CampoFormularioUpdate,
    CampoFormularioResponse,
)
from app.crud.campos_crud import (
    crear_campo,
    listar_campos,
    actualizar_campo,
    eliminar_campo,
)

# ✅ Mantén tu auth actual (no rompemos nada)
from app.routers.auth import get_current_user, require_admin
from app.models.usuario import Usuario, RolEnum

router = APIRouter(prefix="/campos", tags=["Campos Formulario"])


# ===============================
# LISTAR (ADMIN y OPERADOR)
# ===============================
@router.get("", response_model=list[CampoFormularioResponse])
def get_campos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # ✅ Permitir ADMIN u OPERADOR
    if current_user.rol not in (RolEnum.ADMIN, RolEnum.OPERADOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para esta acción",
        )

    return listar_campos(db)


# ===============================
# CREAR (solo ADMIN)
# ===============================
@router.post("", response_model=CampoFormularioResponse, status_code=status.HTTP_201_CREATED)
def create_campo(
    payload: CampoFormularioCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    return crear_campo(db, payload, admin)


# ===============================
# ACTUALIZAR (solo ADMIN)
# ===============================
@router.put("/{campo_id}", response_model=CampoFormularioResponse)
def update_campo(
    campo_id: int,
    payload: CampoFormularioUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    campo = db.get(CampoFormulario, campo_id)
    if not campo:
        raise HTTPException(status_code=404, detail="Campo no encontrado")

    return actualizar_campo(db, campo, payload, admin)


# ===============================
# ELIMINAR / DESACTIVAR (solo ADMIN)
# ===============================
@router.delete("/{campo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campo(
    campo_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    campo = db.get(CampoFormulario, campo_id)
    if not campo:
        raise HTTPException(status_code=404, detail="Campo no encontrado")

    eliminar_campo(db, campo, admin)
    return None