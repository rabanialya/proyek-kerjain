"""create platform_config table

Revision ID: l1m2n3o4p5q6
Revises: k1l2m3n4o5p6
Create Date: 2026-11-11 08:00:00.000000

Membuat tabel platform_configs untuk menyimpan konfigurasi rekening
bank/e-wallet platform yang diisi Admin melalui UI.

Hanya ada satu baris aktif (singleton pattern).
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = 'l1m2n3o4p5q6'
down_revision: Union[str, Sequence[str], None] = 'k1l2m3n4o5p6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'platform_configs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('payment_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='bank'),
        sa.Column('bank_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''),
        sa.Column('account_number', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''),
        sa.Column('account_holder', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''),
        sa.Column('branch', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''),
        sa.Column('transfer_note', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''),
        sa.Column('is_configured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('platform_configs')
