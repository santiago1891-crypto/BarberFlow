import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TipoServicioBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: str | None = None
    precio_base: Decimal = Field(..., ge=0)
    duracion_min: int = Field(30, gt=0)
    activo: bool = True


class TipoServicioCreate(TipoServicioBase):
    pass


class TipoServicioUpdate(BaseModel):
    nombre: str | None = Field(None, max_length=100)
    descripcion: str | None = None
    precio_base: Decimal | None = Field(None, ge=0)
    duracion_min: int | None = Field(None, gt=0)
    activo: bool | None = None


class TipoServicioRead(TipoServicioBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
