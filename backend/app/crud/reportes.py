from datetime import date

from sqlalchemy import Date, cast, func, select, text
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
    """Lee directamente la vista public.v_agenda_hoy (ya ordenada por fecha_hora)."""
    result = await db.execute(text("SELECT * FROM public.v_agenda_hoy"))
    return [AgendaHoyItem.model_validate(row) for row in result.mappings().all()]


async def get_comisiones_mes_actual(db: AsyncSession) -> list[ComisionesMesActualItem]:
    """Lee directamente la vista public.v_comisiones_mes_actual."""
    result = await db.execute(text("SELECT * FROM public.v_comisiones_mes_actual"))
    return [ComisionesMesActualItem.model_validate(row) for row in result.mappings().all()]


def _es_hoy():
    """Condición reutilizable: fecha_hora del servicio cae en el día de hoy (según el servidor de Postgres)."""
    return cast(ServicioRealizado.fecha_hora, Date) == func.current_date()


async def get_ganancias_barberos_hoy(db: AsyncSession) -> list[GananciaBarberoHoyItem]:
    """
    Para cada barbero con al menos un servicio hoy: cuántos cortes hizo,
    cuánto facturaron en total esos cortes, y cuánto se lleva ÉL de comisión.
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
        .where(_es_hoy())
        .group_by(Barbero.id, Barbero.nombre, Barbero.apellido)
        .order_by(Barbero.apellido, Barbero.nombre)
    )
    result = await db.execute(stmt)
    return [GananciaBarberoHoyItem.model_validate(row) for row in result.mappings().all()]


async def get_ganancia_barberia_hoy(db: AsyncSession) -> GananciaBarberiaHoyResumen:
    """
    Total del negocio hoy: suma de TODOS los cortes de TODOS los barberos,
    menos lo que se pagó en comisiones. Lo que sobra es lo que se queda la barbería.
    """
    stmt = select(
        func.count(ServicioRealizado.id).label("cantidad_servicios"),
        func.coalesce(func.sum(ServicioRealizado.precio_cobrado), 0).label("total_facturado"),
        func.coalesce(func.sum(ServicioRealizado.comision_monto), 0).label("total_comisiones_pagadas"),
    ).where(_es_hoy())

    result = await db.execute(stmt)
    row = result.mappings().one()

    total_facturado = row["total_facturado"]
    total_comisiones_pagadas = row["total_comisiones_pagadas"]

    return GananciaBarberiaHoyResumen(
        fecha=date.today(),
        cantidad_servicios=row["cantidad_servicios"],
        total_facturado=total_facturado,
        total_comisiones_pagadas=total_comisiones_pagadas,
        ganancia_barberia=total_facturado - total_comisiones_pagadas,
    )

