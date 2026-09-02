import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api.deps import get_db
from app.schemas.servicio_realizado import (
    ServicioRealizadoCreate,
    ServicioRealizadoRead,
    ServicioRealizadoUpdate,
)

router = APIRouter(prefix="/servicios-realizados", tags=["Servicios realizados"])


@router.get("/", response_model=list[ServicioRealizadoRead])
async def listar_servicios_realizados(
    skip: int = 0,
    limit: int = 100,
    barbero_id: int | None = Query(None, description="Filtrar por barbero"),
    tipo_servicio_id: uuid.UUID | None = Query(None, description="Filtrar por tipo de servicio"),
    fecha_desde: datetime | None = Query(None, description="Servicios desde esta fecha/hora (inclusive)"),
    fecha_hasta: datetime | None = Query(None, description="Servicios hasta esta fecha/hora (inclusive)"),
    db: AsyncSession = Depends(get_db),
):
    return await crud.servicio_realizado.get_multi_filtered(
        db,
        skip=skip,
        limit=limit,
        barbero_id=barbero_id,
        tipo_servicio_id=tipo_servicio_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.post("/", response_model=ServicioRealizadoRead, status_code=status.HTTP_201_CREATED)
async def crear_servicio_realizado(obj_in: ServicioRealizadoCreate, db: AsyncSession = Depends(get_db)):
    # Nota: comision_monto la calcula Postgres automáticamente (columna generada).
    return await crud.servicio_realizado.create(db, obj_in=obj_in)


@router.get("/{servicio_id}", response_model=ServicioRealizadoRead)
async def obtener_servicio_realizado(servicio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.servicio_realizado.get(db, servicio_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio realizado no encontrado")
    return db_obj


@router.patch("/{servicio_id}", response_model=ServicioRealizadoRead)
async def actualizar_servicio_realizado(
    servicio_id: uuid.UUID, obj_in: ServicioRealizadoUpdate, db: AsyncSession = Depends(get_db)
):
    db_obj = await crud.servicio_realizado.get(db, servicio_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio realizado no encontrado")
    return await crud.servicio_realizado.update(db, db_obj=db_obj, obj_in=obj_in)


@router.delete("/{servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_servicio_realizado(servicio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.servicio_realizado.remove(db, id=servicio_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio realizado no encontrado")

