import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoTurno


class TurnoBase(BaseModel):
    barbero_id: int
    tipo_servicio_id: uuid.UUID
    fecha_hora: datetime
    estado: EstadoTurno = EstadoTurno.pendiente
    cliente_nombre: str | None = Field(None, max_length=150)
    cliente_telefono: str | None = Field(None, max_length=20)
    notas: str | None = None


class TurnoCreate(TurnoBase):
    pass


class TurnoUpdate(BaseModel):
    barbero_id: int | None = None
    tipo_servicio_id: uuid.UUID | None = None
    fecha_hora: datetime | None = None
    estado: EstadoTurno | None = None
    cliente_nombre: str | None = Field(None, max_length=150)
    cliente_telefono: str | None = Field(None, max_length=20)
    notas: str | None = None


class TurnoRead(TurnoBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TurnoCompletar(BaseModel):
    """Body opcional para POST /turnos/{id}/completar.

    Si no se envía nada, el precio y la comisión se toman automáticamente
    de tipo_servicio.precio_base y barbero.porcentaje_comision.
    """

    precio_cobrado: Decimal | None = Field(None, ge=0, description="Sobreescribe el precio_base del servicio")
    comision_pct: Decimal | None = Field(
        None, ge=0, le=100, description="Sobreescribe el porcentaje_comision del barbero"
    )
    notas: str | None = None

