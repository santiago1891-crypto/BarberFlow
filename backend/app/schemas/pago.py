import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoPago, MetodoPago


class PagoBase(BaseModel):
    servicio_realizado_id: uuid.UUID
    metodo: MetodoPago
    monto: Decimal = Field(..., gt=0)
    estado: EstadoPago = EstadoPago.pendiente
    referencia_externa: str | None = Field(None, max_length=100)
    fecha_pago: datetime | None = None


class PagoCreate(PagoBase):
    pass


class PagoUpdate(BaseModel):
    metodo: MetodoPago | None = None
    monto: Decimal | None = Field(None, gt=0)
    estado: EstadoPago | None = None
    referencia_externa: str | None = Field(None, max_length=100)
    fecha_pago: datetime | None = None


class PagoRead(PagoBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

