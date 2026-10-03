"""agregar comision_pct a tipos_servicio

Revision ID: 4f5f8dc20f76
Revises: b38f12ff5378
Create Date: 2026-09-20 02:21:21.908128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f5f8dc20f76'
down_revision: Union[str, Sequence[str], None] = 'b38f12ff5378'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'tipos_servicio',
        sa.Column('comision_pct', sa.Numeric(precision=5, scale=2), server_default='40', nullable=False),
    )
    op.create_check_constraint(
        op.f('ck_tipos_servicio_tipos_servicio_comision_pct_check'),
        'tipos_servicio',
        'comision_pct >= 0 AND comision_pct <= 100',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f('ck_tipos_servicio_tipos_servicio_comision_pct_check'), 'tipos_servicio', type_='check'
    )
    op.drop_column('tipos_servicio', 'comision_pct')
