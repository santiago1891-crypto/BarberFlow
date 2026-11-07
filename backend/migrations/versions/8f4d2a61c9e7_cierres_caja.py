"""agregar cierres_caja (historial de cierres de caja)

Una fila por CIERRE (varios por día): los totales de la caja que estaba
abierta al momento de cerrar (período desde el último cierre). Cerrar deja
la caja en $0: el Panel de Control muestra hoy menos lo ya cerrado.

Los totales los calcula el backend al cerrar (ver app/crud/cierre_caja.py),
no los manda el navegador. `por_barbero` guarda el desglose del período en
JSONB para el historial y el modal.

Revision ID: 8f4d2a61c9e7
Revises: e2a80e287cef
Create Date: 2026-11-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8f4d2a61c9e7'
down_revision: Union[str, Sequence[str], None] = 'e2a80e287cef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'cierres_caja',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('cerrado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('cantidad_servicios', sa.Integer(), nullable=False),
        sa.Column('total_facturado', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total_comisiones_pagadas', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('ganancia_barberia', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('por_barbero', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_cierres_caja')),
        sa.CheckConstraint('cantidad_servicios >= 0', name=op.f('ck_cierres_caja_cantidad_servicios_gte_0')),
        sa.CheckConstraint('total_facturado >= 0', name=op.f('ck_cierres_caja_total_facturado_gte_0')),
        sa.CheckConstraint('total_comisiones_pagadas >= 0', name=op.f('ck_cierres_caja_total_comisiones_gte_0')),
        sa.CheckConstraint('ganancia_barberia >= 0', name=op.f('ck_cierres_caja_ganancia_barberia_gte_0')),
    )


def downgrade() -> None:
    """Downgrade schema.

    Baja la tabla de cierres: se pierde el historial de ganancias (es el
    propósito de un downgrade de esta migración).
    """
    op.drop_table('cierres_caja')
