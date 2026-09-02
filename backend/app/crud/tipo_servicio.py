from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.tipo_servicio import TipoServicio
from app.schemas.tipo_servicio import TipoServicioCreate, TipoServicioUpdate


class CRUDTipoServicio(CRUDBase[TipoServicio, TipoServicioCreate, TipoServicioUpdate]):
    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        activo: bool | None = None,
    ) -> list[TipoServicio]:
        stmt = select(TipoServicio)
        if activo is not None:
            stmt = stmt.where(TipoServicio.activo == activo)
        stmt = stmt.order_by(TipoServicio.nombre).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())


tipo_servicio = CRUDTipoServicio(TipoServicio)

