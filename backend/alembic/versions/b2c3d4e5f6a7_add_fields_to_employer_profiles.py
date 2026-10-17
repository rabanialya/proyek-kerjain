"""add fields to employer_profiles

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-15 10:05:00.000000

Menambahkan field baru ke tabel employer_profiles:
- tipe_employer   : tipe entitas (Perusahaan, UMKM, Usaha Mandiri, Perorangan)
- sektor          : sektor / industri
- tagline         : slogan singkat
- location        : domisili / lokasi utama
- contact_email   : email kontak yang ditampilkan ke Worker
- whatsapp        : nomor WhatsApp / telepon
- website         : URL website atau media sosial
- work_type       : JSON string list format kerja (remote, on_site, hybrid)
- work_address    : alamat fisik lokasi kerja
- payment_scheme  : JSON string list skema pembayaran
- payment_schedule: kebijakan waktu pembayaran
- is_verified     : status verifikasi (dikelola admin, default False)

Semua kolom baru bersifat nullable kecuali is_verified yang punya default.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Tambahkan kolom baru ke employer_profiles."""
    op.add_column(
        'employer_profiles',
        sa.Column('tipe_employer', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('sektor', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('tagline', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('contact_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('whatsapp', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('website', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('work_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('work_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('payment_scheme', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column('payment_schedule', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'employer_profiles',
        sa.Column(
            'is_verified',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
    )


def downgrade() -> None:
    """Hapus kolom yang ditambahkan di upgrade."""
    op.drop_column('employer_profiles', 'is_verified')
    op.drop_column('employer_profiles', 'payment_schedule')
    op.drop_column('employer_profiles', 'payment_scheme')
    op.drop_column('employer_profiles', 'work_address')
    op.drop_column('employer_profiles', 'work_type')
    op.drop_column('employer_profiles', 'website')
    op.drop_column('employer_profiles', 'whatsapp')
    op.drop_column('employer_profiles', 'contact_email')
    op.drop_column('employer_profiles', 'location')
    op.drop_column('employer_profiles', 'tagline')
    op.drop_column('employer_profiles', 'sektor')
    op.drop_column('employer_profiles', 'tipe_employer')
