import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Barbero(Base):
    __tablename__ = "barberos"
    __table_args__ = (
        CheckConstraint(
            "porcentaje_comision >= 0 AND porcentaje_comision <= 100",
            name="barberos_porcentaje_comision_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150), unique=True)

    # Sueldo fijo mensual en moneda local
    sueldo_fijo: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    # Porcentaje que cobra el barbero sobre cada servicio (ej: 30.00 = 30%)
    porcentaje_comision: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default="0")

    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    fecha_ingreso: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    turnos: Mapped[list["Turno"]] = relationship(back_populates="barbero")
    servicios_realizados: Mapped[list["ServicioRealizado"]] = relationship(back_populates="barbero")

    def __repr__(self) -> str:
        return f"<Barbero {self.nombre} {self.apellido}>"
