from datetime import date

from sqlalchemy import Date, cast, func, literal, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.barbero import Barbero
from app.models.servicio_realizado import ServicioRealizado
from app.schemas.reportes import (
    AgendaHoyItem,
    ComisionesMesActualItem,
    GananciaBarberiaHoyResumen,
    GananciaBarberoHoyItem,
)


async def get_agenda_hoy(db: AsyncSession) -> list[AgendaHoyItem]:
    """Lee la vista public.v_agenda_hoy.

    El ORDER BY va acá y no solo dentro de la vista: Postgres no garantiza
    que el orden de una vista se respete en la consulta que la consume.
    """
    result = await db.execute(text("SELECT * FROM public.v_agenda_hoy ORDER BY fecha_hora"))
    return [AgendaHoyItem.model_validate(row) for row in result.mappings().all()]


async def get_comisiones_mes_actual(db: AsyncSession) -> list[ComisionesMesActualItem]:
    """Lee la vista public.v_comisiones_mes_actual, del que más gana al que menos."""
    result = await db.execute(
        text("SELECT * FROM public.v_comisiones_mes_actual ORDER BY ingreso_total_mes DESC, barbero")
    )
    return [ComisionesMesActualItem.model_validate(row) for row in result.mappings().all()]


def _es_fecha(fecha: date | None = None):
    """Condición reutilizable: servicio del día `fecha` (o de hoy si es None).

    "Hoy" lo decide Postgres (func.current_date()), la misma referencia que
    usan el resto de los reportes, para que la fecha no se desfase según la
    zona horaria de la app.
    """
    if fecha is None:
        return cast(ServicioRealizado.fecha_hora, Date) == func.current_date()
    return cast(ServicioRealizado.fecha_hora, Date) == fecha


async def get_ganancias_barberos_fecha(
    db: AsyncSession, fecha: date | None = None
) -> list[GananciaBarberoHoyItem]:
    """
    Para cada barbero con al menos un servicio en el día: cuántos cortes
    hizo, cuánto facturaron en total esos cortes, y cuánto se lleva ÉL de
    comisión. Con `fecha=None` es "hoy".
    """
    stmt = (
        select(
            Barbero.id.label("barbero_id"),
            (Barbero.nombre + " " + Barbero.apellido).label("barbero"),
            func.count(ServicioRealizado.id).label("cantidad_servicios"),
            func.coalesce(func.sum(ServicioRealizado.precio_cobrado), 0).label("total_facturado"),
            func.coalesce(func.sum(ServicioRealizado.comision_monto), 0).label("total_comision_barbero"),
        )
        .join(ServicioRealizado, ServicioRealizado.barbero_id == Barbero.id)
        .where(_es_fecha(fecha))
        .group_by(Barbero.id, Barbero.nombre, Barbero.apellido)
        .order_by(Barbero.apellido, Barbero.nombre)
    )
    result = await db.execute(stmt)
    return [GananciaBarberoHoyItem.model_validate(row) for row in result.mappings().all()]


async def get_ganancias_barberos_hoy(db: AsyncSession) -> list[GananciaBarberoHoyItem]:
    """Lo que se lleva cada barbero hoy (ver get_ganancias_barberos_fecha)."""
    return await get_ganancias_barberos_fecha(db)


async def get_ganancia_barberia_fecha(
    db: AsyncSession, fecha: date | None = None
) -> GananciaBarberiaHoyResumen:
    """
    Total del negocio en el día: suma de TODOS los cortes de TODOS los
    barberos, menos lo que se pagó en comisiones. Lo que sobra es lo que se
    queda la barbería. Con `fecha=None` es "hoy".
    """
    # La fecha la calcula Postgres cuando es hoy, la misma base que filtra
    # por "hoy": así el día informado nunca puede diferir del día realmente
    # sumado (date.today() usa la zona horaria de la app y se desfasaba).
    fecha_sel = (
        func.current_date().label("fecha") if fecha is None else literal(fecha, type_=Date).label("fecha")
    )
    stmt = select(
        func.count(ServicioRealizado.id).label("cantidad_servicios"),
        func.coalesce(func.sum(ServicioRealizado.precio_cobrado), 0).label("total_facturado"),
        func.coalesce(func.sum(ServicioRealizado.comision_monto), 0).label("total_comisiones_pagadas"),
        fecha_sel,
    ).where(_es_fecha(fecha))

    result = await db.execute(stmt)
    row = result.mappings().one()

    total_facturado = row["total_facturado"]
    total_comisiones_pagadas = row["total_comisiones_pagadas"]

    return GananciaBarberiaHoyResumen(
        fecha=row["fecha"],
        cantidad_servicios=row["cantidad_servicios"],
        total_facturado=total_facturado,
        total_comisiones_pagadas=total_comisiones_pagadas,
        ganancia_barberia=total_facturado - total_comisiones_pagadas,
    )


async def get_ganancia_barberia_hoy(db: AsyncSession) -> GananciaBarberiaHoyResumen:
    """Total del negocio hoy (ver get_ganancia_barberia_fecha)."""
    return await get_ganancia_barberia_fecha(db)
