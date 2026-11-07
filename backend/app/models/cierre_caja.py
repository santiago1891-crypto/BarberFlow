import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, Numeric, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CierreCaja(Base):
    """Un cierre de caja: los totales de UNA caja (período) al cerrarla.

    Cerrar guarda los valores de la caja que estaba abierta (lo facturado
    desde el último cierre, o desde el inicio del día si es el primero) y
    deja la caja en $0 para seguir vendiendo: por eso puede haber VARIOS
    cierres en el mismo día, y cada fila es un incremento (no un acumulado)
    para que la suma del historial dé el total real.

    `por_barbero` guarda el desglose del período al cerrar (JSONB, solo
    presentación) para poder mostrarlo en el historial y en el modal.
    """

    __tablename__ = "cierres_caja"
    __table_args__ = (
        CheckConstraint("cantidad_servicios >= 0", name="cantidad_servicios_gte_0"),
        CheckConstraint("total_facturado >= 0", name="total_facturado_gte_0"),
        CheckConstraint("total_comisiones_pagadas >= 0", name="total_comisiones_gte_0"),
        CheckConstraint("ganancia_barberia >= 0", name="ganancia_barberia_gte_0"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    # Día al que pertenece el cierre (varios por día posible). "Hoy" lo
    # define Postgres (current_date), igual que en los reportes.
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    # Momento exacto en que se presionó "Cerrar caja" (hora real del cierre)
    cerrado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    cantidad_servicios: Mapped[int] = mapped_column(Integer, nullable=False)
    total_facturado: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_comisiones_pagadas: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    ganancia_barberia: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Desglose por barbero al cierre (JSONB, solo presentación): alimenta
    # el dashboard congelado. Se guarda ya serializado (mode="json") para
    # que los Decimal no rompan el json.dumps de la columna.
    por_barbero: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<CierreCaja {self.fecha}>"
