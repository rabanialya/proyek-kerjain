"""add decision to disputes

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-10-21 00:01:00.000000

Menambahkan kolom decision ke tabel disputes untuk mendukung
keputusan terstruktur Admin saat menyelesaikan dispute:

  - decision: approve_work | reject_work | needs_revision
              NULL selama dispute belum diselesaikan.

Kolom nullable — tidak mempengaruhi record dispute yang sudah ada.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'disputes',
        sa.Column('decision', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('disputes', 'decision')
