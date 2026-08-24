import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import EstadoTurno


class AgendaHoyItem(BaseModel):
    """Refleja la vista public.v_agenda_hoy"""

    model_config = ConfigDict(from_attributes=True)

    turno_id: uuid.UUID
    barbero: str
    servicio: str
    fecha_hora: datetime
    estado: EstadoTurno
    cliente_nombre: str | None
    cliente_telefono: str | None
    duracion_min: int


class ComisionesMesActualItem(BaseModel):
    """Refleja la vista public.v_comisiones_mes_actual"""

    model_config = ConfigDict(from_attributes=True)

    barbero_id: int
    barbero: str
    sueldo_fijo: Decimal
    servicios_realizados: int
    total_facturado: Decimal
    total_comisiones: Decimal
    ingreso_total_mes: Decimal
