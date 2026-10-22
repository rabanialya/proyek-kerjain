"""add payment verification fields

Revision ID: e1f2a3b4c5d6
Revises: d2e3f4a5b6c7
Create Date: 2026-10-21 00:00:00.000000

Menambahkan kolom-kolom berikut ke tabel payments untuk mendukung
alur verifikasi transfer bank manual oleh Admin:

- transfer_proof_url  : URL file bukti transfer yang diunggah Employer
- rejection_reason    : Alasan penolakan jika Admin menolak bukti
- verified_by         : UUID Admin yang memverifikasi pembayaran
- verified_at         : Waktu verifikasi oleh Admin

Semua kolom nullable — tidak mempengaruhi record payment yang sudah ada.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Kolom untuk bukti transfer yang diunggah Employer
    op.add_column(
        'payments',
        sa.Column('transfer_proof_url', sa.Text(), nullable=True)
    )

    # Alasan penolakan Admin (diisi jika status = 'rejected')
    op.add_column(
        'payments',
        sa.Column('rejection_reason', sa.Text(), nullable=True)
    )

    # Admin yang memverifikasi (FK ke users.id)
    op.add_column(
        'payments',
        sa.Column('verified_by', sa.Uuid(), nullable=True)
    )
    op.create_foreign_key(
        'fk_payments_verified_by_users',
        'payments',
        'users',
        ['verified_by'],
        ['id']
    )

    # Waktu verifikasi Admin
    op.add_column(
        'payments',
        sa.Column('verified_at', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_payments_verified_by_users',
        'payments',
        type_='foreignkey'
    )
    op.drop_column('payments', 'verified_at')
    op.drop_column('payments', 'verified_by')
    op.drop_column('payments', 'rejection_reason')
    op.drop_column('payments', 'transfer_proof_url')
