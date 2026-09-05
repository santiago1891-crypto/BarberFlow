import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.servicio_realizado import ServicioRealizado
from app.schemas.servicio_realizado import ServicioRealizadoCreate, ServicioRealizadoUpdate


class CRUDServicioRealizado(CRUDBase[ServicioRealizado, ServicioRealizadoCreate, ServicioRealizadoUpdate]):
    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        barbero_id: int | None = None,
        tipo_servicio_id: uuid.UUID | None = None,
        fecha_desde: datetime | None = None,
        fecha_hasta: datetime | None = None,
    ) -> list[ServicioRealizado]:
        stmt = select(ServicioRealizado)
        if barbero_id is not None:
            stmt = stmt.where(ServicioRealizado.barbero_id == barbero_id)
        if tipo_servicio_id is not None:
            stmt = stmt.where(ServicioRealizado.tipo_servicio_id == tipo_servicio_id)
        if fecha_desde is not None:
            stmt = stmt.where(ServicioRealizado.fecha_hora >= fecha_desde)
        if fecha_hasta is not None:
            stmt = stmt.where(ServicioRealizado.fecha_hora <= fecha_hasta)
        stmt = stmt.order_by(ServicioRealizado.fecha_hora.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())


servicio_realizado = CRUDServicioRealizado(ServicioRealizado)
