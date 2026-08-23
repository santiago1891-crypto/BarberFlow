import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api.deps import get_db
from app.schemas.tipo_servicio import TipoServicioCreate, TipoServicioRead, TipoServicioUpdate

router = APIRouter(prefix="/tipos-servicio", tags=["Tipos de servicio"])


@router.get("/", response_model=list[TipoServicioRead])
async def listar_tipos_servicio(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await crud.tipo_servicio.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=TipoServicioRead, status_code=status.HTTP_201_CREATED)
async def crear_tipo_servicio(obj_in: TipoServicioCreate, db: AsyncSession = Depends(get_db)):
    return await crud.tipo_servicio.create(db, obj_in=obj_in)


@router.get("/{tipo_servicio_id}", response_model=TipoServicioRead)
async def obtener_tipo_servicio(tipo_servicio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.tipo_servicio.get(db, tipo_servicio_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de servicio no encontrado")
    return db_obj


@router.patch("/{tipo_servicio_id}", response_model=TipoServicioRead)
async def actualizar_tipo_servicio(
    tipo_servicio_id: uuid.UUID, obj_in: TipoServicioUpdate, db: AsyncSession = Depends(get_db)
):
    db_obj = await crud.tipo_servicio.get(db, tipo_servicio_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de servicio no encontrado")
    return await crud.tipo_servicio.update(db, db_obj=db_obj, obj_in=obj_in)


@router.delete("/{tipo_servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_tipo_servicio(tipo_servicio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.tipo_servicio.remove(db, id=tipo_servicio_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de servicio no encontrado")
