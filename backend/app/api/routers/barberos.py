from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api.deps import get_db
from app.schemas.barbero import BarberoCreate, BarberoRead, BarberoUpdate

router = APIRouter(prefix="/barberos", tags=["Barberos"])


@router.get("/", response_model=list[BarberoRead])
async def listar_barberos(
    skip: int = 0,
    limit: int = 100,
    activo: bool | None = Query(None, description="Filtrar por barberos activos/inactivos"),
    db: AsyncSession = Depends(get_db),
):
    return await crud.barbero.get_multi_filtered(db, skip=skip, limit=limit, activo=activo)


@router.post("/", response_model=BarberoRead, status_code=status.HTTP_201_CREATED)
async def crear_barbero(barbero_in: BarberoCreate, db: AsyncSession = Depends(get_db)):
    return await crud.barbero.create(db, obj_in=barbero_in)


@router.get("/{barbero_id}", response_model=BarberoRead)
async def obtener_barbero(barbero_id: int, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.barbero.get(db, barbero_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barbero no encontrado")
    return db_obj


@router.patch("/{barbero_id}", response_model=BarberoRead)
async def actualizar_barbero(
    barbero_id: int, barbero_in: BarberoUpdate, db: AsyncSession = Depends(get_db)
):
    db_obj = await crud.barbero.get(db, barbero_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barbero no encontrado")
    return await crud.barbero.update(db, db_obj=db_obj, obj_in=barbero_in)


@router.delete("/{barbero_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_barbero(barbero_id: int, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.barbero.remove(db, id=barbero_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barbero no encontrado")

