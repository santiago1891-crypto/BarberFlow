import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class BarberoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    telefono: str | None = Field(None, max_length=20)
    email: EmailStr | None = Field(None, max_length=150)
    sueldo_fijo: Decimal = Decimal("0")
    porcentaje_comision: Decimal = Field(Decimal("0"), ge=0, le=100)
    activo: bool = True


class BarberoCreate(BarberoBase):
    fecha_ingreso: date | None = None  # si no se manda, Postgres usa CURRENT_DATE


class BarberoUpdate(BaseModel):
    """Todos los campos opcionales: se actualiza solo lo que se envía (PATCH)."""

    nombre: str | None = Field(None, max_length=100)
    apellido: str | None = Field(None, max_length=100)
    telefono: str | None = Field(None, max_length=20)
    email: EmailStr | None = Field(None, max_length=150)
    sueldo_fijo: Decimal | None = None
    porcentaje_comision: Decimal | None = Field(None, ge=0, le=100)
    activo: bool | None = None


class BarberoRead(BarberoBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fecha_ingreso: date
    created_at: datetime
    updated_at: datetime
