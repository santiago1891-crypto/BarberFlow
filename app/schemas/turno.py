import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoTurno


class TurnoBase(BaseModel):
    barbero_id: uuid.UUID
    tipo_servicio_id: uuid.UUID
    fecha_hora: datetime
    estado: EstadoTurno = EstadoTurno.pendiente
    cliente_nombre: str | None = Field(None, max_length=150)
    cliente_telefono: str | None = Field(None, max_length=20)
    notas: str | None = None


class TurnoCreate(TurnoBase):
    pass


class TurnoUpdate(BaseModel):
    barbero_id: uuid.UUID | None = None
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
