"""add fields to reports

Revision ID: i1j2k3l4m5n6
Revises: h1i2j3k4l5m6
Create Date: 2026-11-03 10:30:00.000000

Menambahkan kolom-kolom baru ke tabel reports untuk mendukung fitur
Laporan yang lebih lengkap:

  - reported_task_id: UUID nullable, FK ke tasks.id — target laporan berupa task
  - reason_category:  Text nullable — kategori alasan laporan terstruktur
                      (fraud | wrong_info | inappropriate | spam |
                       rule_violation | other)
  - admin_notes:      Text nullable — catatan Admin saat menangani laporan

Semua kolom nullable agar data laporan lama tetap valid tanpa migrasi data.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'i1j2k3l4m5n6'
down_revision: Union[str, Sequence[str], None] = 'h1i2j3k4l5m6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'reports',
        sa.Column('reported_task_id', sa.UUID(), nullable=True)
    )
    op.add_column(
        'reports',
        sa.Column('reason_category', sa.Text(), nullable=True)
    )
    op.add_column(
        'reports',
        sa.Column('admin_notes', sa.Text(), nullable=True)
    )

    # Tambah FK ke tasks.id (nullable, tidak cascade)
    op.create_foreign_key(
        'fk_reports_reported_task_id_tasks',
        'reports', 'tasks',
        ['reported_task_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_reports_reported_task_id_tasks',
        'reports',
        type_='foreignkey'
    )
    op.drop_column('reports', 'admin_notes')
    op.drop_column('reports', 'reason_category')
    op.drop_column('reports', 'reported_task_id')
