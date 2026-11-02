"""add target_role to notifications

Revision ID: g1h2i3j4k5l6
Revises: f2a3b4c5d6e7
Create Date: 2026-11-02 00:01:00.000000

Menambahkan kolom target_role ke tabel notifications untuk mendukung
routing notifikasi berdasarkan peran penerima, bukan berdasarkan profil
yang dimiliki pengguna.

  - target_role: "worker" | "employer" | "admin"
                 NULL untuk data notifikasi lama (sebelum migrasi ini).
                 Notifikasi baru wajib mengisi kolom ini.

Kolom nullable — tidak mempengaruhi record notifikasi yang sudah ada dan
tidak menghapus data lama.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'notifications',
        sa.Column('target_role', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('notifications', 'target_role')
