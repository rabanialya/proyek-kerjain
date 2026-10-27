"""add disbursement fields to payments

Revision ID: a1b2c3d4e5f7
Revises: f2a3b4c5d6e7
Create Date: 2026-10-23 00:00:00.000000

Menambahkan kolom-kolom berikut ke tabel payments untuk mendukung
alur pencairan manual dari platform ke Worker (Fase 7):

- disbursed_by          : UUID Admin yang mengkonfirmasi pencairan
- disbursed_at          : Waktu Admin mengkonfirmasi pencairan (bukan paid_at yang bisa
                          dipakai verify; ini khusus disbursement)
- disbursement_reference: Referensi transaksi bank keluar (nomor referensi transfer)
- disbursement_proof_url: URL file bukti transfer keluar ke Worker
- disbursement_notes    : Catatan Admin terkait pencairan

Semua kolom nullable — tidak mempengaruhi record payment yang sudah ada.
paid_at tetap dipertahankan untuk kompatibilitas data lama.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Admin yang melakukan konfirmasi pencairan (FK ke users.id)
    op.add_column(
        'payments',
        sa.Column('disbursed_by', sa.Uuid(), nullable=True)
    )
    op.create_foreign_key(
        'fk_payments_disbursed_by_users',
        'payments',
        'users',
        ['disbursed_by'],
        ['id']
    )

    # Waktu konfirmasi pencairan oleh Admin
    op.add_column(
        'payments',
        sa.Column('disbursed_at', sa.DateTime(), nullable=True)
    )

    # Referensi transaksi bank keluar (nomor referensi / kode unik)
    op.add_column(
        'payments',
        sa.Column('disbursement_reference', sa.Text(), nullable=True)
    )

    # URL file bukti transfer keluar ke Worker
    op.add_column(
        'payments',
        sa.Column('disbursement_proof_url', sa.Text(), nullable=True)
    )

    # Catatan Admin terkait pencairan
    op.add_column(
        'payments',
        sa.Column('disbursement_notes', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('payments', 'disbursement_notes')
    op.drop_column('payments', 'disbursement_proof_url')
    op.drop_column('payments', 'disbursement_reference')
    op.drop_column('payments', 'disbursed_at')
    op.drop_constraint(
        'fk_payments_disbursed_by_users',
        'payments',
        type_='foreignkey'
    )
    op.drop_column('payments', 'disbursed_by')
