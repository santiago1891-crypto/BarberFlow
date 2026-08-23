import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Computed, DateTime, ForeignKey, Numeric, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ServicioRealizado(Base):
    """Registro de cada servicio ejecutado. Es la base para calcular comisiones."""

    __tablename__ = "servicios_realizados"
    __table_args__ = (
        CheckConstraint("precio_cobrado >= 0", name="servicios_realizados_precio_cobrado_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    barbero_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("barberos.id"), nullable=False
    )
    tipo_servicio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tipos_servicio.id"), nullable=False
    )
    # NULL si el servicio fue sin reserva previa (walk-in)
    turno_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("turnos.id"))

    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    precio_cobrado: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Snapshot del porcentaje de comisión al momento del servicio
    comision_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    # Columna generada por Postgres: round(precio_cobrado * comision_pct / 100, 2)
    # No se debe asignar manualmente: la calcula la base de datos.
    comision_monto: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        Computed("round((precio_cobrado * comision_pct) / 100, 2)", persisted=True),
        nullable=False,
    )

    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    barbero: Mapped["Barbero"] = relationship(back_populates="servicios_realizados")
    tipo_servicio: Mapped["TipoServicio"] = relationship(back_populates="servicios_realizados")
    turno: Mapped["Turno | None"] = relationship(back_populates="servicios_realizados")
    pagos: Mapped[list["Pago"]] = relationship(back_populates="servicio_realizado")

    def __repr__(self) -> str:
        return f"<ServicioRealizado {self.id}>"
