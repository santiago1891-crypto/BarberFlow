import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TipoServicio(Base):
    __tablename__ = "tipos_servicio"
    __table_args__ = (
        CheckConstraint("duracion_min > 0", name="tipos_servicio_duracion_min_check"),
        CheckConstraint("precio_base >= 0", name="tipos_servicio_precio_base_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)

    # Precio de lista del servicio
    precio_base: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Duración estimada en minutos, sirve para organizar turnos
    duracion_min: Mapped[int] = mapped_column(Integer, nullable=False, server_default="30")

    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    turnos: Mapped[list["Turno"]] = relationship(back_populates="tipo_servicio")
    servicios_realizados: Mapped[list["ServicioRealizado"]] = relationship(back_populates="tipo_servicio")

    def __repr__(self) -> str:
        return f"<TipoServicio {self.nombre}>"
