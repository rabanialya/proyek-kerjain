"""add description to categories

Revision ID: h1i2j3k4l5m6
Revises: g1h2i3j4k5l6
Create Date: 2026-11-03 10:00:00.000000

Menambahkan kolom description ke tabel categories untuk mendukung
pengelolaan kategori oleh Admin.

  - description: teks opsional deskripsi kategori.

Kolom nullable — tidak mempengaruhi data kategori yang sudah ada.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'h1i2j3k4l5m6'
down_revision: Union[str, Sequence[str], None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'categories',
        sa.Column('description', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('categories', 'description')
