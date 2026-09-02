import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.api.deps import get_db
from app.crud.base import ReglaDeNegocioError
from app.models.enums import EstadoTurno
from app.schemas.servicio_realizado import ServicioRealizadoRead
from app.schemas.turno import TurnoCompletar, TurnoCreate, TurnoRead, TurnoUpdate

router = APIRouter(prefix="/turnos", tags=["Turnos"])


@router.get("/", response_model=list[TurnoRead])
async def listar_turnos(
    skip: int = 0,
    limit: int = 100,
    barbero_id: int | None = Query(None, description="Filtrar por barbero"),
    estado: EstadoTurno | None = Query(None, description="Filtrar por estado del turno"),
    fecha_desde: datetime | None = Query(None, description="Turnos desde esta fecha/hora (inclusive)"),
    fecha_hasta: datetime | None = Query(None, description="Turnos hasta esta fecha/hora (inclusive)"),
    db: AsyncSession = Depends(get_db),
):
    return await crud.turno.get_multi_filtered(
        db,
        skip=skip,
        limit=limit,
        barbero_id=barbero_id,
        estado=estado,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.post("/", response_model=TurnoRead, status_code=status.HTTP_201_CREATED)
async def crear_turno(obj_in: TurnoCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await crud.turno.create(db, obj_in=obj_in)
    except ReglaDeNegocioError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


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
    try:
        return await crud.turno.update(db, db_obj=db_obj, obj_in=obj_in)
    except ReglaDeNegocioError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e


@router.delete("/{turno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_turno(turno_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_obj = await crud.turno.remove(db, id=turno_id)
    if db_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno no encontrado")


@router.post("/{turno_id}/completar", response_model=ServicioRealizadoRead, status_code=status.HTTP_201_CREATED)
async def completar_turno(turno_id: uuid.UUID, body: TurnoCompletar, db: AsyncSession = Depends(get_db)):
    """
    Marca el turno como completado y registra automáticamente el servicio
    realizado correspondiente (precio y comisión tomados de tipo_servicio y
    barbero salvo que se los sobreescriba en el body).
    """
    try:
        return await crud.turno.completar(db, turno_id=turno_id, body=body)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except ReglaDeNegocioError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e

