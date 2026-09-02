import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, func, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EstadoPago, MetodoPago


class Pago(Base):
    """Registro de cobros por servicio."""

    __tablename__ = "pagos"
    __table_args__ = (CheckConstraint("monto > 0", name="pagos_monto_check"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    servicio_realizado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("servicios_realizados.id"), nullable=False
    )
    metodo: Mapped[MetodoPago] = mapped_column(
        SAEnum(MetodoPago, name="metodo_pago", native_enum=True), nullable=False
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    estado: Mapped[EstadoPago] = mapped_column(
        SAEnum(EstadoPago, name="estado_pago", native_enum=True),
        nullable=False,
        server_default=EstadoPago.pendiente.value,
    )
    # Número de comprobante, código de transacción o referencia del medio de pago
    referencia_externa: Mapped[str | None] = mapped_column(String(100))
    # Momento en que se confirmó el pago. NULL si aún está pendiente
    fecha_pago: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    servicio_realizado: Mapped["ServicioRealizado"] = relationship(back_populates="pagos")

    def __repr__(self) -> str:
        return f"<Pago {self.id} {self.estado}>"

