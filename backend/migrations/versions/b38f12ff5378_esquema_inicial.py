"""esquema inicial

Revision ID: b38f12ff5378
Revises: 
Create Date: 2026-09-20 02:21:02.041234

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b38f12ff5378'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('barberos',
    sa.Column('id', sa.Integer(), sa.Identity(always=True), nullable=False),
    sa.Column('nombre', sa.String(length=100), nullable=False),
    sa.Column('apellido', sa.String(length=100), nullable=False),
    sa.Column('telefono', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=150), nullable=True),
    sa.Column('sueldo_fijo', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False),
    sa.Column('porcentaje_comision', sa.Numeric(precision=5, scale=2), server_default='0', nullable=False),
    sa.Column('activo', sa.Boolean(), server_default=sa.text('(true)'), nullable=False),
    sa.Column('fecha_ingreso', sa.Date(), server_default=sa.text('(CURRENT_DATE)'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint('porcentaje_comision >= 0 AND porcentaje_comision <= 100', name=op.f('ck_barberos_barberos_porcentaje_comision_check')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_barberos')),
    sa.UniqueConstraint('email', name=op.f('uq_barberos_email'))
    )
    op.create_table('tipos_servicio',
    sa.Column('id', sa.UUID(), server_default=sa.text('(gen_random_uuid())'), nullable=False),
    sa.Column('nombre', sa.String(length=100), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=True),
    sa.Column('precio_base', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('duracion_min', sa.Integer(), server_default='30', nullable=False),
    sa.Column('activo', sa.Boolean(), server_default=sa.text('(true)'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint('duracion_min > 0', name=op.f('ck_tipos_servicio_tipos_servicio_duracion_min_check')),
    sa.CheckConstraint('precio_base >= 0', name=op.f('ck_tipos_servicio_tipos_servicio_precio_base_check')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tipos_servicio')),
    sa.UniqueConstraint('nombre', name=op.f('uq_tipos_servicio_nombre'))
    )
    op.create_table('turnos',
    sa.Column('id', sa.UUID(), server_default=sa.text('(gen_random_uuid())'), nullable=False),
    sa.Column('barbero_id', sa.Integer(), nullable=False),
    sa.Column('tipo_servicio_id', sa.UUID(), nullable=False),
    sa.Column('fecha_hora', sa.DateTime(timezone=True), nullable=False),
    sa.Column('estado', sa.Enum('pendiente', 'confirmado', 'en_curso', 'completado', 'cancelado', name='estado_turno'), server_default='pendiente', nullable=False),
    sa.Column('cliente_nombre', sa.String(length=150), nullable=True),
    sa.Column('cliente_telefono', sa.String(length=20), nullable=True),
    sa.Column('notas', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['barbero_id'], ['barberos.id'], name=op.f('fk_turnos_barbero_id_barberos')),
    sa.ForeignKeyConstraint(['tipo_servicio_id'], ['tipos_servicio.id'], name=op.f('fk_turnos_tipo_servicio_id_tipos_servicio')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_turnos'))
    )
    op.create_table('servicios_realizados',
    sa.Column('id', sa.UUID(), server_default=sa.text('(gen_random_uuid())'), nullable=False),
    sa.Column('barbero_id', sa.Integer(), nullable=False),
    sa.Column('tipo_servicio_id', sa.UUID(), nullable=False),
    sa.Column('turno_id', sa.UUID(), nullable=True),
    sa.Column('fecha_hora', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('precio_cobrado', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('comision_pct', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('comision_monto', sa.Numeric(precision=10, scale=2), sa.Computed('round((precio_cobrado * comision_pct) / 100, 2)', persisted=True), nullable=False),
    sa.Column('notas', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint('precio_cobrado >= 0', name=op.f('ck_servicios_realizados_servicios_realizados_precio_cobrado_check')),
    sa.ForeignKeyConstraint(['barbero_id'], ['barberos.id'], name=op.f('fk_servicios_realizados_barbero_id_barberos')),
    sa.ForeignKeyConstraint(['tipo_servicio_id'], ['tipos_servicio.id'], name=op.f('fk_servicios_realizados_tipo_servicio_id_tipos_servicio')),
    sa.ForeignKeyConstraint(['turno_id'], ['turnos.id'], name=op.f('fk_servicios_realizados_turno_id_turnos')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_servicios_realizados'))
    )
    op.create_table('pagos',
    sa.Column('id', sa.UUID(), server_default=sa.text('(gen_random_uuid())'), nullable=False),
    sa.Column('servicio_realizado_id', sa.UUID(), nullable=False),
    sa.Column('metodo', sa.Enum('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'mercado_pago', name='metodo_pago'), nullable=False),
    sa.Column('monto', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('estado', sa.Enum('pendiente', 'pagado', 'reembolsado', name='estado_pago'), server_default='pendiente', nullable=False),
    sa.Column('referencia_externa', sa.String(length=100), nullable=True),
    sa.Column('fecha_pago', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint('monto > 0', name=op.f('ck_pagos_pagos_monto_check')),
    sa.ForeignKeyConstraint(['servicio_realizado_id'], ['servicios_realizados.id'], name=op.f('fk_pagos_servicio_realizado_id_servicios_realizados')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pagos'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('pagos')
    op.drop_table('servicios_realizados')
    op.drop_table('turnos')
    op.drop_table('tipos_servicio')
    op.drop_table('barberos')
