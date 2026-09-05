import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EstadoTurno


class Turno(Base):
    __tablename__ = "turnos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    barbero_id: Mapped[int] = mapped_column(Integer, ForeignKey("barberos.id"), nullable=False)
    tipo_servicio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tipos_servicio.id"), nullable=False
    )

    # Fecha y hora del turno en zona horaria del servidor
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Ciclo: pendiente -> confirmado -> en_curso -> completado / cancelado
    estado: Mapped[EstadoTurno] = mapped_column(
        SAEnum(EstadoTurno, name="estado_turno", native_enum=True),
        nullable=False,
        server_default=EstadoTurno.pendiente.value,
    )

    # El cliente es anónimo: solo se guarda nombre y teléfono de contacto
    cliente_nombre: Mapped[str | None] = mapped_column(String(150))
    cliente_telefono: Mapped[str | None] = mapped_column(String(20))
    notas: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    barbero: Mapped["Barbero"] = relationship(back_populates="turnos")
    tipo_servicio: Mapped["TipoServicio"] = relationship(back_populates="turnos")
    servicios_realizados: Mapped[list["ServicioRealizado"]] = relationship(back_populates="turno")

    def __repr__(self) -> str:
        return f"<Turno {self.id} {self.fecha_hora}>"
