from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, ConfigDict


class AccionEnum(str, Enum):
    CREAR = "crear"
    EDITAR = "editar"
    ELIMINAR = "eliminar"


class LogBase(BaseModel):
    usuario_id: int
    accion: AccionEnum
    entidad: str
    entidad_id: int
    datos_anteriores: Optional[Dict[str, Any]] = None
    datos_nuevos: Optional[Dict[str, Any]] = None


class LogResponse(LogBase):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
