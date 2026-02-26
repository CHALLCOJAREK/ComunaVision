from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class CampoFormularioBase(BaseModel):
    nombre_campo: str
    tipo: str
    obligatorio: bool = False
    opciones: Optional[Dict[str, Any]] = None
    activo: bool = True


class CampoFormularioCreate(CampoFormularioBase):
    pass


class CampoFormularioUpdate(BaseModel):
    nombre_campo: Optional[str] = None
    tipo: Optional[str] = None
    obligatorio: Optional[bool] = None
    opciones: Optional[Dict[str, Any]] = None
    activo: Optional[bool] = None


class CampoFormularioResponse(CampoFormularioBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
