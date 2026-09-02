import uuid
from datetime import date, datetime
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


class GananciaBarberoHoyItem(BaseModel):
    """Lo que se lleva cada barbero hoy, sumando la comisión de todos sus cortes del día."""

    barbero_id: int
    barbero: str
    cantidad_servicios: int
    total_facturado: Decimal  # lo que cobraron sus servicios en total (bruto)
    total_comision_barbero: Decimal  # lo que se lleva EL BARBERO (su ganancia del día)


class GananciaBarberiaHoyResumen(BaseModel):
    """Lo que le queda a la barbería hoy: facturación total menos lo pagado en comisiones."""

    fecha: date
    cantidad_servicios: int
    total_facturado: Decimal  # todo lo cobrado hoy, entre todos los barberos
    total_comisiones_pagadas: Decimal  # suma de lo que se llevan los barberos
    ganancia_barberia: Decimal  # total_facturado - total_comisiones_pagadas

