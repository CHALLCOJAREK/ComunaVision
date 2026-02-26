from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, ConfigDict


class ComuneroBase(BaseModel):
    nombre: str
    documento: str
    datos_dinamicos: Dict[str, Any] = {}


class ComuneroCreate(ComuneroBase):
    pass


class ComuneroUpdate(BaseModel):
    nombre: Optional[str] = None
    documento: Optional[str] = None
    datos_dinamicos: Optional[Dict[str, Any]] = None
    is_deleted: Optional[bool] = None


class ComuneroResponse(ComuneroBase):
    id: int
    creado_por: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
