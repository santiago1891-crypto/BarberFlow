import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TipoServicioBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: str | None = None
    precio_base: Decimal = Field(..., ge=0)
    duracion_min: int = Field(30, gt=0)
    # % que se le aplica al barbero al registrar un servicio de este tipo.
    # Antes no estaba en el schema: Pydantic lo descartaba al crear/editar y
    # TipoServicioRead ni lo devolvía, por eso la UI siempre mostraba "—".
    comision_pct: Decimal = Field(default=Decimal("40"), ge=0, le=100)
    activo: bool = True


class TipoServicioCreate(TipoServicioBase):
    pass


class TipoServicioUpdate(BaseModel):
    nombre: str | None = Field(None, max_length=100)
    descripcion: str | None = None
    precio_base: Decimal | None = Field(None, ge=0)
    duracion_min: int | None = Field(None, gt=0)
    comision_pct: Decimal | None = Field(None, ge=0, le=100)
    activo: bool | None = None


class TipoServicioRead(TipoServicioBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
