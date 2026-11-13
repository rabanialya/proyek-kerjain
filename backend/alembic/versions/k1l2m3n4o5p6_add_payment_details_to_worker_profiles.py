"""add payment details to worker profiles

Revision ID: k1l2m3n4o5p6
Revises: j1k2l3m4n5o6
Create Date: 2026-11-10 09:00:00.000000

Menambahkan dua kolom ke tabel worker_profiles untuk menyimpan
detail rekening bank dan e-wallet worker:

- bank_details    : JSON string { "bank_name": str, "account_number": str }
- ewallet_details : JSON string { "provider": str, "phone_number": str }

Kedua kolom nullable — worker yang sudah ada tidak terpengaruh.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = 'k1l2m3n4o5p6'
down_revision: Union[str, Sequence[str], None] = 'j1k2l3m4n5o6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'worker_profiles',
        sa.Column('bank_details', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('ewallet_details', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('worker_profiles', 'ewallet_details')
    op.drop_column('worker_profiles', 'bank_details')
