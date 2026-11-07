from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import ReglaDeNegocioError
from app.crud import reportes
from app.models.cierre_caja import CierreCaja
from app.schemas.cierre_caja import CajaActual, CierreCajaRead
from app.schemas.reportes import GananciaBarberoHoyItem

_CERO = Decimal("0")


async def _fecha_de_hoy(db: AsyncSession) -> date:
    """'Hoy' según Postgres (la misma base que usan los reportes)."""
    return (await db.execute(select(func.current_date()))).scalar_one()


async def _cierres_de_fecha(db: AsyncSession, fecha: date) -> list[CierreCaja]:
    """Cierres guardados de esa fecha, del más antiguo al más reciente."""
    stmt = select(CierreCaja).where(CierreCaja.fecha == fecha).order_by(CierreCaja.cerrado_en)
    return list((await db.execute(stmt)).scalars().all())


def _cerrado_previo(previos: list[CierreCaja]) -> tuple[int, Decimal, Decimal, dict[int, dict]]:
    """Totales ya cerrados de esa fecha (acumulado de los cierres anteriores).

    Devuelve además el desglose por barbero (suma de los `por_barbero` de
    cada cierre, que vienen como strings desde el JSONB).
    """
    servicios = sum(c.cantidad_servicios for c in previos)
    facturado = sum((c.total_facturado for c in previos), _CERO)
    comisiones = sum((c.total_comisiones_pagadas for c in previos), _CERO)

    por_barbero: dict[int, dict] = {}
    for c in previos:
        for g in c.por_barbero or []:
            acc = por_barbero.setdefault(
                int(g["barbero_id"]),
                {"cantidad_servicios": 0, "total_facturado": _CERO, "total_comision_barbero": _CERO},
            )
            acc["cantidad_servicios"] += int(g.get("cantidad_servicios") or 0)
            acc["total_facturado"] += Decimal(str(g.get("total_facturado") or 0))
            acc["total_comision_barbero"] += Decimal(str(g.get("total_comision_barbero") or 0))
    return servicios, facturado, comisiones, por_barbero


def _clamp(valor: Decimal) -> Decimal:
    # Si después de cerrar se borró una venta que ya estaba en un cierre,
    # la diferencia podría quedar negativa: la caja actual no puede deber.
    return valor if valor > _CERO else _CERO


def _periodo(
    resumen,
    barberos: list[GananciaBarberoHoyItem],
    previos: list[CierreCaja],
) -> tuple[dict, list[dict]]:
    """Totales de la caja ACTUAL: lo de hoy menos lo que ya se cerró.

    Es la misma cuenta que hace el dashboard para mostrar $0 después de
    cerrar, y la que guarda el cierre (un cierre registra el INCREMENTO de
    esa caja, no el acumulado del día, para que el historial sume bien).
    """
    prev_servicios, prev_facturado, prev_comisiones, prev_por_barbero = _cerrado_previo(previos)

    valores = {
        "cantidad_servicios": max(0, resumen.cantidad_servicios - prev_servicios),
        "total_facturado": _clamp(resumen.total_facturado - prev_facturado),
        "total_comisiones_pagadas": _clamp(resumen.total_comisiones_pagadas - prev_comisiones),
    }
    valores["ganancia_barberia"] = _clamp(valores["total_facturado"] - valores["total_comisiones_pagadas"])

    por_barbero: list[dict] = []
    for g in barberos:
        p = prev_por_barbero.get(
            int(g.barbero_id),
            {"cantidad_servicios": 0, "total_facturado": _CERO, "total_comision_barbero": _CERO},
        )
        cantidad = max(0, g.cantidad_servicios - int(p["cantidad_servicios"]))
        facturado = _clamp(g.total_facturado - p["total_facturado"])
        comision = _clamp(g.total_comision_barbero - p["total_comision_barbero"])
        # Solo los barberos con actividad en ESTA caja
        if cantidad == 0 and facturado == _CERO:
            continue
        por_barbero.append(
            GananciaBarberoHoyItem(
                barbero_id=g.barbero_id,
                barbero=g.barbero,
                cantidad_servicios=cantidad,
                total_facturado=facturado,
                total_comision_barbero=comision,
            ).model_dump(mode="json")
        )
    return valores, por_barbero


async def get_caja_actual(db: AsyncSession) -> CajaActual:
    """La caja ABIERTA ahora: lo facturado hoy menos lo que ya se cerró."""
    resumen = await reportes.get_ganancia_barberia_fecha(db)  # hoy
    barberos = await reportes.get_ganancias_barberos_fecha(db)
    previos = await _cierres_de_fecha(db, resumen.fecha)
    valores, por_barbero = _periodo(resumen, barberos, previos)
    return CajaActual(
        fecha=resumen.fecha,
        **valores,
        por_barbero=[GananciaBarberoHoyItem.model_validate(g) for g in por_barbero],
        ultimo_cierre=CierreCajaRead.model_validate(previos[-1]) if previos else None,
    )


async def guardar_cierre(db: AsyncSession, fecha: date | None = None):
    """Cierra la caja actual: guarda sus totales (el período, no el día
    acumulado) y deja la caja en $0 para seguir vendiendo.

    Los totales se calculan acá, en el servidor, con las mismas queries que
    /reportes/*: el registro no depende de lo que el navegador tenía cargado.
    """
    resumen = await reportes.get_ganancia_barberia_fecha(db, fecha)
    barberos = await reportes.get_ganancias_barberos_fecha(db, fecha)
    previos = await _cierres_de_fecha(db, resumen.fecha)
    valores, por_barbero = _periodo(resumen, barberos, previos)

    if valores["cantidad_servicios"] == 0 and valores["total_facturado"] == _CERO:
        # No tiene sentido un cierre en $0 en el historial (y evita filas
        # basura si se aprieta "cerrar" dos veces seguidas).
        raise ReglaDeNegocioError("La caja actual no tiene ventas para cerrar.")

    stmt = (
        pg_insert(CierreCaja)
        .values(fecha=resumen.fecha, cerrado_en=func.now(), por_barbero=por_barbero, **valores)
        .returning(CierreCaja)
    )
    db_obj = (await db.execute(stmt)).scalar_one()
    await db.commit()
    return db_obj


async def get_ultimo_hoy(db: AsyncSession) -> CierreCaja | None:
    """Último cierre de hoy (el más reciente), si hubo alguno."""
    hoy = await _fecha_de_hoy(db)
    stmt = (
        select(CierreCaja)
        .where(CierreCaja.fecha == hoy)
        .order_by(CierreCaja.cerrado_en.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalars().first()


async def eliminar_ultimo_hoy(db: AsyncSession) -> bool:
    """Deshace el último cierre de hoy: sus totales vuelven a la caja
    actual (que se recalcula como hoy − los cierres que queden).
    Idempotente: si no hay cierres, no hace nada."""
    ultimo = await get_ultimo_hoy(db)
    if ultimo is None:
        return False
    await db.delete(ultimo)
    await db.commit()
    return True


async def listar(db: AsyncSession, limit: int = 100) -> list[CierreCaja]:
    """Historial de cierres, del más reciente al más antiguo."""
    stmt = select(CierreCaja).order_by(CierreCaja.cerrado_en.desc()).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def eliminar_todo_de_fecha(db: AsyncSession, fecha: date) -> int:
    """Borra todos los cierres de una fecha (uso interno/tests)."""
    result = await db.execute(delete(CierreCaja).where(CierreCaja.fecha == fecha))
    await db.commit()
    return int(result.rowcount or 0)
