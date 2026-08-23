import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ServicioRealizadoBase(BaseModel):
    barbero_id: uuid.UUID
    tipo_servicio_id: uuid.UUID
    turno_id: uuid.UUID | None = None  # None si fue walk-in (sin reserva)
    fecha_hora: datetime | None = None  # si no se manda, se usa now()
    precio_cobrado: Decimal = Field(..., ge=0)
    comision_pct: Decimal = Field(..., ge=0, le=100)
    notas: str | None = None


class ServicioRealizadoCreate(ServicioRealizadoBase):
    pass


class ServicioRealizadoUpdate(BaseModel):
    """No permite tocar comision_monto: es columna generada por la base de datos."""

    barbero_id: uuid.UUID | None = None
    tipo_servicio_id: uuid.UUID | None = None
    turno_id: uuid.UUID | None = None
    precio_cobrado: Decimal | None = Field(None, ge=0)
    comision_pct: Decimal | None = Field(None, ge=0, le=100)
    notas: str | None = None


class ServicioRealizadoRead(ServicioRealizadoBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    comision_monto: Decimal
    created_at: datetime
