import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.reportes import GananciaBarberoHoyItem


class CierreCajaRead(BaseModel):
    """Un cierre: los totales de UNA caja (período) al cerrarla."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    fecha: date
    cerrado_en: datetime
    cantidad_servicios: int
    total_facturado: Decimal
    total_comisiones_pagadas: Decimal
    ganancia_barberia: Decimal
    # Desglose del período por barbero al momento de cerrar
    por_barbero: list[GananciaBarberoHoyItem] | None = None


class CierreCajaCreate(BaseModel):
    """Body del cierre de caja.

    Los totales NO se envían desde el navegador: los calcula el backend al
    momento de cerrar, con el mismo criterio que ve el dashboard (hoy menos
    lo ya cerrado). Cada cierre guarda el INCREMENTO de la caja que estaba
    abierta y la deja en $0; `fecha` es opcional (hoy según Postgres) y
    sirve para cerrar una caja de un día anterior olvidado.
    """

    fecha: date | None = None


class CajaActual(BaseModel):
    """La caja ABIERTA ahora: lo facturado hoy menos lo que ya se cerró.

    Es lo que muestra el Panel de Control; al cerrar, esos totales pasan a
    un registro del historial y la caja vuelve a $0.
    """

    model_config = ConfigDict(from_attributes=True)

    fecha: date
    cantidad_servicios: int
    total_facturado: Decimal
    total_comisiones_pagadas: Decimal
    ganancia_barberia: Decimal
    por_barbero: list[GananciaBarberoHoyItem] = []
    # Último cierre de hoy, si hubo alguno (para el aviso "deshacer")
    ultimo_cierre: CierreCajaRead | None = None
