import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api.deps import get_db
from app.crud.base import ReglaDeNegocioError
from app.models.enums import EstadoPago
from app.schemas.pago import PagoCreate, PagoRead, PagoUpdate

router = APIRouter(prefix="/pagos", tags=["Pagos"])


@router.get("/", response_model=list[PagoRead])
async def listar_pagos(
    skip: int = 0,
    limit: int = 100,
    estado: EstadoPago | None = Query(None, description="Filtrar por estado del pago"),
    servicio_realizado_id: uuid.UUID | None = Query(None, description="Filtrar por servicio realizado"),
    db: AsyncSession = Depends(get_db),
):
    return await crud.pago.get_multi_filtered(
        db, skip=skip, limit=limit, estado=estado, servicio_realizado_id=servicio_realizado_id
    )


@router.post("/", response_model=PagoRead, status_code=status.HTTP_201_CREATED)
async def crear_pago(obj_in: PagoCreate, db: AsyncSession = Depends(get_db)):
    return await crud.pago.create(db, obj_in=obj_in)


@router.get("/{pago_id}", response_model=PagoRead)
async def obtener_pago(pago_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.pago.get(db, pago_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")
    return db_obj


@router.patch("/{pago_id}", response_model=PagoRead)
async def actualizar_pago(pago_id: uuid.UUID, obj_in: PagoUpdate, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.pago.get(db, pago_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")
    try:
        return await crud.pago.update(db, db_obj=db_obj, obj_in=obj_in)
    except ReglaDeNegocioError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.delete("/{pago_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_pago(pago_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.pago.remove(db, id=pago_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")
