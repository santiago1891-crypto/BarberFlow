from datetime import date

from sqlalchemy import Date, cast, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.barbero import Barbero
from app.models.pago import Pago
from app.models.servicio_realizado import ServicioRealizado
from app.schemas.reportes import (
    CierreCajaResumen,
    GananciaBarberiaHoyResumen,
    GananciaBarberoHoyItem,
)


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


async def cerrar_caja_hoy(db: AsyncSession, *, confirmar: bool) -> CierreCajaResumen:
    """
    Cierre de caja del día.

    Siempre calcula y devuelve el resumen (ganancia por barbero + ganancia
    de la barbería). Si confirmar=True, además BORRA los servicios_realizados
    de hoy (y sus pagos asociados, por la foreign key), dejando la caja en
    cero para el día siguiente. Es irreversible: se recomienda llamar primero
    con confirmar=False para revisar los números.
    """
    ganancias_por_barbero = await get_ganancias_barberos_hoy(db)
    resumen_barberia = await get_ganancia_barberia_hoy(db)

    servicios_eliminados = 0
    pagos_eliminados = 0

    if confirmar:
        # IDs de los servicios realizados hoy (los que se van a borrar)
        stmt_ids = select(ServicioRealizado.id).where(_es_hoy())
        result_ids = await db.execute(stmt_ids)
        ids_hoy = [row[0] for row in result_ids.all()]

        if ids_hoy:
            # 1. Borrar primero los pagos asociados (FK: pagos.servicio_realizado_id)
            result_pagos = await db.execute(delete(Pago).where(Pago.servicio_realizado_id.in_(ids_hoy)))
            pagos_eliminados = result_pagos.rowcount or 0

            # 2. Ahora sí, borrar los servicios realizados de hoy
            result_servicios = await db.execute(
                delete(ServicioRealizado).where(ServicioRealizado.id.in_(ids_hoy))
            )
            servicios_eliminados = result_servicios.rowcount or 0

            await db.commit()

    return CierreCajaResumen(
        fecha=date.today(),
        confirmado=confirmar,
        ganancias_por_barbero=ganancias_por_barbero,
        resumen_barberia=resumen_barberia,
        servicios_eliminados=servicios_eliminados,
        pagos_eliminados=pagos_eliminados,
    )
