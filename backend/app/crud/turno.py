import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase, ReglaDeNegocioError
from app.models.barbero import Barbero
from app.models.enums import EstadoTurno
from app.models.servicio_realizado import ServicioRealizado
from app.models.tipo_servicio import TipoServicio
from app.models.turno import Turno
from app.schemas.turno import TurnoCompletar, TurnoCreate, TurnoUpdate

# Transiciones válidas del ciclo de vida de un turno.
# pendiente -> confirmado -> en_curso -> completado
# cualquier estado no terminal puede cancelarse.
TRANSICIONES_VALIDAS: dict[EstadoTurno, set[EstadoTurno]] = {
    EstadoTurno.pendiente: {EstadoTurno.confirmado, EstadoTurno.cancelado},
    EstadoTurno.confirmado: {EstadoTurno.en_curso, EstadoTurno.cancelado},
    EstadoTurno.en_curso: {EstadoTurno.completado, EstadoTurno.cancelado},
    EstadoTurno.completado: set(),
    EstadoTurno.cancelado: set(),
}


class CRUDTurno(CRUDBase[Turno, TurnoCreate, TurnoUpdate]):
    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        barbero_id: int | None = None,
        estado: EstadoTurno | None = None,
        fecha_desde: datetime | None = None,
        fecha_hasta: datetime | None = None,
    ) -> list[Turno]:
        stmt = select(Turno)
        if barbero_id is not None:
            stmt = stmt.where(Turno.barbero_id == barbero_id)
        if estado is not None:
            stmt = stmt.where(Turno.estado == estado)
        if fecha_desde is not None:
            stmt = stmt.where(Turno.fecha_hora >= fecha_desde)
        if fecha_hasta is not None:
            stmt = stmt.where(Turno.fecha_hora <= fecha_hasta)
        stmt = stmt.order_by(Turno.fecha_hora).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def _validar_sin_solapamiento(
        self,
        db: AsyncSession,
        *,
        barbero_id: int,
        tipo_servicio_id: uuid.UUID,
        fecha_hora: datetime,
        excluir_turno_id: uuid.UUID | None = None,
    ) -> None:
        """Un barbero no puede tener dos turnos (no cancelados) que se solapen en el tiempo."""
        tipo_servicio = await db.get(TipoServicio, tipo_servicio_id)
        if tipo_servicio is None:
            raise ReglaDeNegocioError(f"tipo_servicio_id {tipo_servicio_id} no existe")

        nuevo_inicio = fecha_hora
        nuevo_fin = fecha_hora + timedelta(minutes=tipo_servicio.duracion_min)

        stmt = (
            select(Turno.id, Turno.fecha_hora, TipoServicio.duracion_min)
            .join(TipoServicio, TipoServicio.id == Turno.tipo_servicio_id)
            .where(
                Turno.barbero_id == barbero_id,
                Turno.estado != EstadoTurno.cancelado,
            )
        )
        if excluir_turno_id is not None:
            stmt = stmt.where(Turno.id != excluir_turno_id)

        result = await db.execute(stmt)
        for otro_id, otro_inicio, otro_duracion_min in result.all():
            otro_fin = otro_inicio + timedelta(minutes=otro_duracion_min)
            # Dos intervalos se solapan si uno empieza antes de que el otro termine, y viceversa.
            if nuevo_inicio < otro_fin and otro_inicio < nuevo_fin:
                raise ReglaDeNegocioError(
                    f"El barbero ya tiene el turno {otro_id} entre {otro_inicio} y {otro_fin}, "
                    f"que se superpone con el horario solicitado ({nuevo_inicio} - {nuevo_fin})."
                )

    async def create(self, db: AsyncSession, *, obj_in: TurnoCreate) -> Turno:
        await self._validar_sin_solapamiento(
            db,
            barbero_id=obj_in.barbero_id,
            tipo_servicio_id=obj_in.tipo_servicio_id,
            fecha_hora=obj_in.fecha_hora,
        )
        return await super().create(db, obj_in=obj_in)

    async def update(
        self, db: AsyncSession, *, db_obj: Turno, obj_in: TurnoUpdate | dict[str, Any]
    ) -> Turno:
        update_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)

        nuevo_estado = update_data.get("estado")
        if nuevo_estado is not None and nuevo_estado != db_obj.estado:
            permitidos = TRANSICIONES_VALIDAS.get(db_obj.estado, set())
            if nuevo_estado not in permitidos:
                raise ReglaDeNegocioError(
                    f"No se puede pasar un turno de '{db_obj.estado.value}' a '{nuevo_estado.value}'. "
                    f"Transiciones válidas desde '{db_obj.estado.value}': "
                    f"{[e.value for e in permitidos] or 'ninguna (estado terminal)'}"
                )

        # Si cambia el horario, el barbero o el tipo de servicio, re-validar solapamiento.
        if {"fecha_hora", "barbero_id", "tipo_servicio_id"} & update_data.keys():
            await self._validar_sin_solapamiento(
                db,
                barbero_id=update_data.get("barbero_id", db_obj.barbero_id),
                tipo_servicio_id=update_data.get("tipo_servicio_id", db_obj.tipo_servicio_id),
                fecha_hora=update_data.get("fecha_hora", db_obj.fecha_hora),
                excluir_turno_id=db_obj.id,
            )

        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def completar(
        self, db: AsyncSession, *, turno_id: uuid.UUID, body: TurnoCompletar
    ) -> ServicioRealizado:
        """Marca el turno como completado y crea el ServicioRealizado asociado."""
        db_turno = await self.get(db, turno_id)
        if db_turno is None:
            raise LookupError(f"Turno {turno_id} no encontrado")

        permitidos = TRANSICIONES_VALIDAS.get(db_turno.estado, set())
        if EstadoTurno.completado not in permitidos:
            raise ReglaDeNegocioError(
                f"No se puede completar un turno en estado '{db_turno.estado.value}'. "
                f"Transiciones válidas desde '{db_turno.estado.value}': "
                f"{[e.value for e in permitidos] or 'ninguna (estado terminal)'}"
            )

        barbero = await db.get(Barbero, db_turno.barbero_id)
        tipo_servicio = await db.get(TipoServicio, db_turno.tipo_servicio_id)

        servicio = ServicioRealizado(
            barbero_id=db_turno.barbero_id,
            tipo_servicio_id=db_turno.tipo_servicio_id,
            turno_id=db_turno.id,
            fecha_hora=db_turno.fecha_hora,
            precio_cobrado=body.precio_cobrado if body.precio_cobrado is not None else tipo_servicio.precio_base,
            comision_pct=body.comision_pct if body.comision_pct is not None else barbero.porcentaje_comision,
            notas=body.notas,
        )
        db_turno.estado = EstadoTurno.completado

        db.add(servicio)
        db.add(db_turno)
        await db.commit()
        await db.refresh(servicio)
        return servicio


turno = CRUDTurno(Turno)
