from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import reportes as crud_reportes
from app.schemas.reportes import CierreCajaResumen, GananciaBarberiaHoyResumen, GananciaBarberoHoyItem

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/ganancias-barberos-hoy", response_model=list[GananciaBarberoHoyItem])
async def ganancias_barberos_hoy(db: AsyncSession = Depends(get_db)):
    """Cuánto se lleva cada barbero HOY, sumando la comisión de todos sus cortes del día."""
    return await crud_reportes.get_ganancias_barberos_hoy(db)


@router.get("/ganancia-barberia-hoy", response_model=GananciaBarberiaHoyResumen)
async def ganancia_barberia_hoy(db: AsyncSession = Depends(get_db)):
    """Cuánto se queda la barbería HOY: total facturado menos comisiones pagadas a barberos."""
    return await crud_reportes.get_ganancia_barberia_hoy(db)


@router.post("/cerrar-caja-hoy", response_model=CierreCajaResumen)
async def cerrar_caja_hoy(
    confirmar: bool = Query(
        False,
        description=(
            "False (default): solo muestra el resumen, no borra nada. "
            "True: borra los servicios_realizados y pagos de hoy. Es IRREVERSIBLE."
        ),
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Cierre de caja del día.

    Recomendado: llamar primero SIN confirmar (o con confirmar=false) para
    revisar cuánto ganó cada barbero y cuánto se queda la barbería. Una vez
    verificados los números, llamar de nuevo con confirmar=true para borrar
    los registros del día y dejar la caja en cero para mañana.
    """
    return await crud_reportes.cerrar_caja_hoy(db, confirmar=confirmar)
