from datetime import date
from decimal import Decimal

from pydantic import BaseModel


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


class CierreCajaResumen(BaseModel):
    """Resultado de POST /reportes/cerrar-caja-hoy"""

    fecha: date
    confirmado: bool  # False = solo vista previa, no se borró nada. True = se borró.
    ganancias_por_barbero: list[GananciaBarberoHoyItem]
    resumen_barberia: GananciaBarberiaHoyResumen
    servicios_eliminados: int
    pagos_eliminados: int
