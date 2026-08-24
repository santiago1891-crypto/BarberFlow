from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.reportes import AgendaHoyItem, ComisionesMesActualItem


async def get_agenda_hoy(db: AsyncSession) -> list[AgendaHoyItem]:
    """Lee directamente la vista public.v_agenda_hoy (ya ordenada por fecha_hora)."""
    result = await db.execute(text("SELECT * FROM public.v_agenda_hoy"))
    return [AgendaHoyItem.model_validate(row) for row in result.mappings().all()]


async def get_comisiones_mes_actual(db: AsyncSession) -> list[ComisionesMesActualItem]:
    """Lee directamente la vista public.v_comisiones_mes_actual."""
    result = await db.execute(text("SELECT * FROM public.v_comisiones_mes_actual"))
    return [ComisionesMesActualItem.model_validate(row) for row in result.mappings().all()]
