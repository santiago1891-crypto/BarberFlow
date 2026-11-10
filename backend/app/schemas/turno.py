import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import EstadoTurno
from app.schemas._timezones import a_aware


class TurnoBase(BaseModel):
    barbero_id: int
    tipo_servicio_id: uuid.UUID
    fecha_hora: datetime
    cliente_nombre: str | None = Field(None, max_length=150)
    cliente_telefono: str | None = Field(None, max_length=20)
    notas: str | None = None

    @field_validator("fecha_hora", mode="before")
    @classmethod
    def _fecha_con_timezone(cls, v):
        # Sin esto, una fecha naive del cliente chocaba al compararla con
        # las de la base (aware) -> 500 "can't compare offset-naive and
        # offset-aware datetimes".
        return a_aware(v)


class TurnoCreate(TurnoBase):
    """Alta de turno.

    No acepta `estado`: el turno SIEMPRE nace "pendiente" (default de la
    columna en la base). Si el cliente pudiera mandar el estado en el POST,
    podría crear un turno "completado" o "cancelado" saltándose toda la
    máquina de TRANSICIONES_VALIDAS de app/crud/turno.py — y un "completado"
    ni siquiera generaría el ServicioRealizado correspondiente.
    """

    pass


class TurnoUpdate(BaseModel):
    barbero_id: int | None = None
    tipo_servicio_id: uuid.UUID | None = None
    fecha_hora: datetime | None = None
    estado: EstadoTurno | None = None
    cliente_nombre: str | None = Field(None, max_length=150)
    cliente_telefono: str | None = Field(None, max_length=20)
    notas: str | None = None

    @field_validator("fecha_hora", mode="before")
    @classmethod
    def _fecha_con_timezone(cls, v):
        return a_aware(v)


class TurnoRead(TurnoBase):
    model_config = ConfigDict(from_attributes=True)

    estado: EstadoTurno = EstadoTurno.pendiente
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class TurnoCompletar(BaseModel):
    """Body opcional para POST /turnos/{id}/completar.

    Si no se envía nada, el precio y la comisión se toman automáticamente
    de tipo_servicio.precio_base y tipo_servicio.comision_pct (con el
    porcentaje del barbero como respaldo si el servicio no lo tiene).
    """

    precio_cobrado: Decimal | None = Field(None, ge=0, description="Sobreescribe el precio_base del servicio")
    comision_pct: Decimal | None = Field(
        None, ge=0, le=100, description="Sobreescribe el porcentaje_comision del barbero"
    )
    notas: str | None = None
