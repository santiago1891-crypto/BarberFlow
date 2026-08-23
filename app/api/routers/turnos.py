import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api.deps import get_db
from app.schemas.turno import TurnoCreate, TurnoRead, TurnoUpdate

router = APIRouter(prefix="/turnos", tags=["Turnos"])


@router.get("/", response_model=list[TurnoRead])
async def listar_turnos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await crud.turno.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=TurnoRead, status_code=status.HTTP_201_CREATED)
async def crear_turno(obj_in: TurnoCreate, db: AsyncSession = Depends(get_db)):
    return await crud.turno.create(db, obj_in=obj_in)


@router.get("/{turno_id}", response_model=TurnoRead)
async def obtener_turno(turno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.turno.get(db, turno_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno no encontrado")
    return db_obj


@router.patch("/{turno_id}", response_model=TurnoRead)
async def actualizar_turno(turno_id: uuid.UUID, obj_in: TurnoUpdate, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.turno.get(db, turno_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno no encontrado")
    return await crud.turno.update(db, db_obj=db_obj, obj_in=obj_in)


@router.delete("/{turno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_turno(turno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.turno.remove(db, id=turno_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno no encontrado")
