import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase, ReglaDeNegocioError
from app.models.enums import EstadoPago
from app.models.pago import Pago
from app.schemas.pago import PagoCreate, PagoUpdate

# Transiciones válidas de estado para un pago.
# pendiente -> pagado -> reembolsado. "reembolsado" es un estado terminal.
TRANSICIONES_VALIDAS: dict[EstadoPago, set[EstadoPago]] = {
    EstadoPago.pendiente: {EstadoPago.pagado},
    EstadoPago.pagado: {EstadoPago.reembolsado},
    EstadoPago.reembolsado: set(),
}


class CRUDPago(CRUDBase[Pago, PagoCreate, PagoUpdate]):
    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        estado: EstadoPago | None = None,
        servicio_realizado_id: uuid.UUID | None = None,
    ) -> list[Pago]:
        stmt = select(Pago)
        if estado is not None:
            stmt = stmt.where(Pago.estado == estado)
        if servicio_realizado_id is not None:
            stmt = stmt.where(Pago.servicio_realizado_id == servicio_realizado_id)
        stmt = stmt.order_by(Pago.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self, db: AsyncSession, *, db_obj: Pago, obj_in: PagoUpdate | dict[str, Any]
    ) -> Pago:
        update_data = obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)

        nuevo_estado = update_data.get("estado")
        if nuevo_estado is not None and nuevo_estado != db_obj.estado:
            permitidos = TRANSICIONES_VALIDAS.get(db_obj.estado, set())
            if nuevo_estado not in permitidos:
                raise ReglaDeNegocioError(
                    f"No se puede pasar un pago de '{db_obj.estado.value}' a '{nuevo_estado.value}'. "
                    f"Transiciones válidas desde '{db_obj.estado.value}': "
                    f"{[e.value for e in permitidos] or 'ninguna (estado terminal)'}"
                )

        return await super().update(db, db_obj=db_obj, obj_in=update_data)


pago = CRUDPago(Pago)
