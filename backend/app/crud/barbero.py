from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.barbero import Barbero
from app.schemas.barbero import BarberoCreate, BarberoUpdate


class CRUDBarbero(CRUDBase[Barbero, BarberoCreate, BarberoUpdate]):
    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        activo: bool | None = None,
    ) -> list[Barbero]:
        stmt = select(Barbero)
        if activo is not None:
            stmt = stmt.where(Barbero.activo == activo)
        stmt = stmt.order_by(Barbero.apellido, Barbero.nombre).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())


barbero = CRUDBarbero(Barbero)
