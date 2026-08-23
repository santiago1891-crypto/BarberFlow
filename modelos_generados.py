from typing import Optional
import datetime
import decimal
import enum
import uuid

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Computed, Date, DateTime, Enum, ForeignKeyConstraint, Index, Integer, Numeric, PrimaryKeyConstraint, String, Table, Text, UniqueConstraint, Uuid, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class EstadoPago(str, enum.Enum):
    PENDIENTE = 'pendiente'
    PAGADO = 'pagado'
    REEMBOLSADO = 'reembolsado'


class EstadoTurno(str, enum.Enum):
    PENDIENTE = 'pendiente'
    CONFIRMADO = 'confirmado'
    EN_CURSO = 'en_curso'
    COMPLETADO = 'completado'
    CANCELADO = 'cancelado'


class MetodoPago(str, enum.Enum):
    EFECTIVO = 'efectivo'
    TARJETA_DEBITO = 'tarjeta_debito'
    TARJETA_CREDITO = 'tarjeta_credito'
    TRANSFERENCIA = 'transferencia'
    MERCADO_PAGO = 'mercado_pago'


class Barberos(Base):
    __tablename__ = 'barberos'
    __table_args__ = (
        CheckConstraint('porcentaje_comision >= 0::numeric AND porcentaje_comision <= 100::numeric', name='barberos_porcentaje_comision_check'),
        PrimaryKeyConstraint('id', name='barberos_pkey'),
        UniqueConstraint('email', name='barberos_email_key'),
        {'comment': 'Empleados de la barbería'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    sueldo_fijo: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default=text('0'), comment='Sueldo fijo mensual en moneda local')
    porcentaje_comision: Mapped[decimal.Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default=text('0'), comment='Porcentaje que cobra el barbero sobre cada servicio (ej: 30.00 = 30%)')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    fecha_ingreso: Mapped[datetime.date] = mapped_column(Date, nullable=False, server_default=text('CURRENT_DATE'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    telefono: Mapped[Optional[str]] = mapped_column(String(20))
    email: Mapped[Optional[str]] = mapped_column(String(150))

    turnos: Mapped[list['Turnos']] = relationship('Turnos', back_populates='barbero')
    servicios_realizados: Mapped[list['ServiciosRealizados']] = relationship('ServiciosRealizados', back_populates='barbero')


class TiposServicio(Base):
    __tablename__ = 'tipos_servicio'
    __table_args__ = (
        CheckConstraint('duracion_min > 0', name='tipos_servicio_duracion_min_check'),
        CheckConstraint('precio_base >= 0::numeric', name='tipos_servicio_precio_base_check'),
        PrimaryKeyConstraint('id', name='tipos_servicio_pkey'),
        UniqueConstraint('nombre', name='tipos_servicio_nombre_key'),
        {'comment': 'Catálogo de servicios que ofrece la barbería'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    precio_base: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False, comment='Precio de lista del servicio')
    duracion_min: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('30'), comment='Duración estimada en minutos, sirve para organizar turnos')
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)

    turnos: Mapped[list['Turnos']] = relationship('Turnos', back_populates='tipo_servicio')
    servicios_realizados: Mapped[list['ServiciosRealizados']] = relationship('ServiciosRealizados', back_populates='tipo_servicio')


t_v_agenda_hoy = Table(
    'v_agenda_hoy', Base.metadata,
    Column('turno_id', Uuid),
    Column('barbero', Text),
    Column('servicio', String(100)),
    Column('fecha_hora', DateTime(True)),
    Column('estado', Enum(EstadoTurno, values_callable=lambda cls: [member.value for member in cls], name='estado_turno')),
    Column('cliente_nombre', String(150)),
    Column('cliente_telefono', String(20)),
    Column('duracion_min', Integer)
)


t_v_comisiones_mes_actual = Table(
    'v_comisiones_mes_actual', Base.metadata,
    Column('barbero_id', Uuid),
    Column('barbero', Text),
    Column('sueldo_fijo', Numeric(10, 2)),
    Column('servicios_realizados', BigInteger),
    Column('total_facturado', Numeric),
    Column('total_comisiones', Numeric),
    Column('ingreso_total_mes', Numeric)
)


class Turnos(Base):
    __tablename__ = 'turnos'
    __table_args__ = (
        ForeignKeyConstraint(['barbero_id'], ['barberos.id'], name='turnos_barbero_id_fkey'),
        ForeignKeyConstraint(['tipo_servicio_id'], ['tipos_servicio.id'], name='turnos_tipo_servicio_id_fkey'),
        PrimaryKeyConstraint('id', name='turnos_pkey'),
        Index('idx_turnos_barbero_fecha', 'barbero_id', 'fecha_hora'),
        Index('idx_turnos_estado', 'estado'),
        {'comment': 'Reservas de turnos. El cliente es anónimo, se guarda solo nombre '
                'y teléfono de contacto'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    barbero_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_servicio_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, comment='Fecha y hora del turno en zona horaria del servidor')
    estado: Mapped[EstadoTurno] = mapped_column(Enum(EstadoTurno, values_callable=lambda cls: [member.value for member in cls], name='estado_turno'), nullable=False, server_default=text("'pendiente'::estado_turno"), comment='Ciclo: pendiente → confirmado → en_curso → completado / cancelado')
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    cliente_nombre: Mapped[Optional[str]] = mapped_column(String(150))
    cliente_telefono: Mapped[Optional[str]] = mapped_column(String(20))
    notas: Mapped[Optional[str]] = mapped_column(Text)

    barbero: Mapped['Barberos'] = relationship('Barberos', back_populates='turnos')
    tipo_servicio: Mapped['TiposServicio'] = relationship('TiposServicio', back_populates='turnos')
    servicios_realizados: Mapped[list['ServiciosRealizados']] = relationship('ServiciosRealizados', back_populates='turno')


class ServiciosRealizados(Base):
    __tablename__ = 'servicios_realizados'
    __table_args__ = (
        CheckConstraint('precio_cobrado >= 0::numeric', name='servicios_realizados_precio_cobrado_check'),
        ForeignKeyConstraint(['barbero_id'], ['barberos.id'], name='servicios_realizados_barbero_id_fkey'),
        ForeignKeyConstraint(['tipo_servicio_id'], ['tipos_servicio.id'], name='servicios_realizados_tipo_servicio_id_fkey'),
        ForeignKeyConstraint(['turno_id'], ['turnos.id'], name='servicios_realizados_turno_id_fkey'),
        PrimaryKeyConstraint('id', name='servicios_realizados_pkey'),
        Index('idx_servicios_barbero', 'barbero_id'),
        Index('idx_servicios_fecha', 'fecha_hora'),
        Index('idx_servicios_turno', 'turno_id'),
        {'comment': 'Registro de cada servicio ejecutado. Es la base para calcular '
                'comisiones'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    barbero_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    tipo_servicio_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    fecha_hora: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    precio_cobrado: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    comision_pct: Mapped[decimal.Decimal] = mapped_column(Numeric(5, 2), nullable=False, comment='Snapshot del porcentaje de comisión al momento del servicio')
    comision_monto: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), Computed('round(((precio_cobrado * comision_pct) / (100)::numeric), 2)', persisted=True), nullable=False, comment='Monto de comisión calculado automáticamente (columna generada)')
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    turno_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, comment='NULL si el servicio fue sin reserva previa (walk-in)')
    notas: Mapped[Optional[str]] = mapped_column(Text)

    barbero: Mapped['Barberos'] = relationship('Barberos', back_populates='servicios_realizados')
    tipo_servicio: Mapped['TiposServicio'] = relationship('TiposServicio', back_populates='servicios_realizados')
    turno: Mapped[Optional['Turnos']] = relationship('Turnos', back_populates='servicios_realizados')
    pagos: Mapped[list['Pagos']] = relationship('Pagos', back_populates='servicio_realizado')


class Pagos(Base):
    __tablename__ = 'pagos'
    __table_args__ = (
        CheckConstraint('monto > 0::numeric', name='pagos_monto_check'),
        ForeignKeyConstraint(['servicio_realizado_id'], ['servicios_realizados.id'], name='pagos_servicio_realizado_id_fkey'),
        PrimaryKeyConstraint('id', name='pagos_pkey'),
        Index('idx_pagos_estado', 'estado'),
        Index('idx_pagos_servicio', 'servicio_realizado_id'),
        {'comment': 'Registro de cobros por servicio'}
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=text('gen_random_uuid()'))
    servicio_realizado_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    metodo: Mapped[MetodoPago] = mapped_column(Enum(MetodoPago, values_callable=lambda cls: [member.value for member in cls], name='metodo_pago'), nullable=False)
    monto: Mapped[decimal.Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    estado: Mapped[EstadoPago] = mapped_column(Enum(EstadoPago, values_callable=lambda cls: [member.value for member in cls], name='estado_pago'), nullable=False, server_default=text("'pendiente'::estado_pago"))
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(True), nullable=False, server_default=text('now()'))
    referencia_externa: Mapped[Optional[str]] = mapped_column(String(100), comment='Número de comprobante, código de transacción o referencia del medio de pago')
    fecha_pago: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(True), comment='Momento en que se confirmó el pago. NULL si aún está pendiente')

    servicio_realizado: Mapped['ServiciosRealizados'] = relationship('ServiciosRealizados', back_populates='pagos')
