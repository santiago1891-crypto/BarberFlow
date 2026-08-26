from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import reportes as crud_reportes
from app.schemas.reportes import (
    AgendaHoyItem,
    ComisionesMesActualItem,
    GananciaBarberiaHoyResumen,
    GananciaBarberoHoyItem,
)

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/agenda-hoy", response_model=list[AgendaHoyItem])
async def agenda_hoy(db: AsyncSession = Depends(get_db)):
    """Turnos del día de hoy, ordenados por hora (vista v_agenda_hoy)."""
    return await crud_reportes.get_agenda_hoy(db)


@router.get("/comisiones-mes-actual", response_model=list[ComisionesMesActualItem])
async def comisiones_mes_actual(db: AsyncSession = Depends(get_db)):
    """Comisiones e ingresos por barbero activo en el mes en curso (vista v_comisiones_mes_actual)."""
    return await crud_reportes.get_comisiones_mes_actual(db)


@router.get("/ganancias-barberos-hoy", response_model=list[GananciaBarberoHoyItem])
async def ganancias_barberos_hoy(db: AsyncSession = Depends(get_db)):
    """Cuánto se lleva cada barbero HOY, sumando la comisión de todos sus cortes del día."""
    return await crud_reportes.get_ganancias_barberos_hoy(db)


@router.get("/ganancia-barberia-hoy", response_model=GananciaBarberiaHoyResumen)
async def ganancia_barberia_hoy(db: AsyncSession = Depends(get_db)):
    """Cuánto se queda la barbería HOY: total facturado menos comisiones pagadas a barberos."""
    return await crud_reportes.get_ganancia_barberia_hoy(db)
