"""Remove cloud_task_id and add fidelity_score

Revision ID: 7a0f62e847cc
Revises: e325891ac2ef
Create Date: 2026-06-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7a0f62e847cc'
down_revision: Union[str, Sequence[str], None] = 'e325891ac2ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('generation_runs', 'cloud_task_id')
    op.add_column('generation_runs', sa.Column('fidelity_score', sa.REAL(), nullable=True))


def downgrade() -> None:
    op.add_column('generation_runs', sa.Column('cloud_task_id', sa.String(), nullable=True))
    op.drop_column('generation_runs', 'fidelity_score')
