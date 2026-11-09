"""add document urls to worker profiles

Revision ID: j1k2l3m4n5o6
Revises: i1j2k3l4m5n6
Create Date: 2026-11-07 10:00:00.000000

Menambahkan kolom untuk menyimpan URL dokumen Worker:
  - cv_url          : TEXT nullable — path file CV/Resume
  - id_document_url : TEXT nullable — path file KTP/KTM
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'j1k2l3m4n5o6'
down_revision = 'i1j2k3l4m5n6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'worker_profiles',
        sa.Column('cv_url', sa.Text(), nullable=True),
    )
    op.add_column(
        'worker_profiles',
        sa.Column('id_document_url', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('worker_profiles', 'id_document_url')
    op.drop_column('worker_profiles', 'cv_url')
