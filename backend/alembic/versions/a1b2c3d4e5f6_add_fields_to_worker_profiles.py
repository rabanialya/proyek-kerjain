"""add fields to worker_profiles

Revision ID: a1b2c3d4e5f6
Revises: ee6d7219f9ee
Create Date: 2026-10-15 10:00:00.000000

Menambahkan field baru ke tabel worker_profiles:
- nickname         : nama panggilan
- location         : domisili / kota
- status_pekerjaan : status saat ini (Mahasiswa, Pelajar, dll.)
- komitmen_jam     : komitmen jam per minggu
- preferensi_shift : JSON string list shift yang disukai
- hari_tersedia    : JSON string list hari tersedia
- tanggal_mulai    : tanggal siap mulai (DATE)

Semua kolom baru bersifat nullable agar tidak merusak data yang sudah ada.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ee6d7219f9ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tambahkan kolom baru ke worker_profiles."""
    op.add_column(
        'worker_profiles',
        sa.Column('nickname', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('status_pekerjaan', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('komitmen_jam', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('preferensi_shift', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('hari_tersedia', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('tanggal_mulai', sa.Date(), nullable=True),
    )


def downgrade() -> None:
    """Hapus kolom yang ditambahkan di upgrade."""
    op.drop_column('worker_profiles', 'tanggal_mulai')
    op.drop_column('worker_profiles', 'hari_tersedia')
    op.drop_column('worker_profiles', 'preferensi_shift')
    op.drop_column('worker_profiles', 'komitmen_jam')
    op.drop_column('worker_profiles', 'status_pekerjaan')
    op.drop_column('worker_profiles', 'location')
    op.drop_column('worker_profiles', 'nickname')
