from datetime import datetime
from typing import Optional
from enum import Enum

from pydantic import BaseModel, EmailStr, ConfigDict


class RolEnum(str, Enum):
    ADMIN = "admin"
    OPERADOR = "operador"


# ------------------------
# Base
# ------------------------

class UsuarioBase(BaseModel):
    email: EmailStr
    nombre: str
    rol: RolEnum = RolEnum.OPERADOR
    activo: bool = True


# ------------------------
# Create
# ------------------------

class UsuarioCreate(UsuarioBase):
    password: str


# ------------------------
# Update
# ------------------------

class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nombre: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[RolEnum] = None
    activo: Optional[bool] = None


# ------------------------
# Response
# ------------------------

class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
