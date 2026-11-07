from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import cierre_caja
from app.schemas.cierre_caja import CajaActual, CierreCajaCreate, CierreCajaRead

router = APIRouter(prefix="/cierres-caja", tags=["Cierre de caja"])


@router.get("/", response_model=list[CierreCajaRead])
async def listar_cierres(
    limit: int = Query(100, ge=1, le=366, description="Máximo de cierres del historial"),
    db: AsyncSession = Depends(get_db),
):
    """Historial de cierres de caja, del más reciente al más antiguo."""
    return await cierre_caja.listar(db, limit=limit)


@router.get("/actual", response_model=CajaActual)
async def obtener_caja_actual(db: AsyncSession = Depends(get_db)):
    """La caja abierta ahora: lo facturado hoy menos lo que ya se cerró.

    Al cerrar, estos totales pasan al historial y la caja vuelve a $0.
    """
    return await cierre_caja.get_caja_actual(db)


@router.post("/", response_model=CierreCajaRead, status_code=status.HTTP_201_CREATED)
async def cerrar_caja(obj_in: CierreCajaCreate, db: AsyncSession = Depends(get_db)):
    """Cierra la caja actual: guarda sus totales (el período, no el día
    acumulado) y la deja en $0 para seguir vendiendo.

    Devuelve 409 si la caja no tiene ventas (un cierre en $0 no aporta nada
    al historial).
    """
    return await cierre_caja.guardar_cierre(db, fecha=obj_in.fecha)


@router.delete("/ultimo-hoy", status_code=status.HTTP_204_NO_CONTENT)
async def deshacer_ultimo_cierre(db: AsyncSession = Depends(get_db)):
    """Deshace el último cierre de hoy: sus totales vuelven a la caja actual.

    Idempotente: si no hay cierres de hoy, no hace nada.
    """
    await cierre_caja.eliminar_ultimo_hoy(db)
