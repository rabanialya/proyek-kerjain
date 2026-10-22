"""add deadline_at to assignments

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-10-19 12:10:00.000000

Menambahkan kolom deadline_at ke tabel assignments.

deadline_at dihitung saat assignment dibuat dari task.work_deadline_days
(N hari kalender sejak assignment.created_at). Setelah diisi, nilai ini
tidak berubah meskipun employer mengubah work_deadline_days di task —
assignment yang sudah berjalan tetap terlindungi.

Kolom nullable: assignment tanpa deadline (kerja terjadwal atau task lama)
cukup dibiarkan NULL.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'assignments',
        sa.Column('deadline_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('assignments', 'deadline_at')
