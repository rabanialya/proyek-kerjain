"""add extended fields to tasks

Revision ID: c1d2e3f4a5b6
Revises: b2c3d4e5f6a7
Create Date: 2026-10-19 12:00:00.000000

Menambahkan field terstruktur ke tabel tasks:
- Jadikan location nullable (Remote tidak wajib lokasi fisik)
- work_type         : tipe kerja (remote, on_site, hybrid) — NULL = belum ditentukan
- wage_rate         : satuan upah (project, hourly, daily, per_output) — NULL = belum ditentukan
- application_deadline : batas akhir pendaftaran (TIMESTAMPTZ)
- work_date         : tanggal pelaksanaan untuk kerja terjadwal (DATE)
- work_time_start   : jam mulai pelaksanaan (TIME)
- work_time_end     : jam selesai pelaksanaan (TIME)
- work_deadline_days: durasi pengerjaan N hari kalender setelah assignment dibuat (SMALLINT)
- required_skills   : keahlian yang dibutuhkan (TEXT)
- requirements_flags: persyaratan terstruktur sebagai JSON string (VARCHAR)
- requirements_note : catatan persyaratan tambahan (TEXT)

Semua kolom baru nullable — task lama tidak terpengaruh.
Tidak ada nilai default yang diasumsikan untuk task lama.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Jadikan kolom location nullable
    #    (task lama sudah punya nilai; task baru tipe Remote boleh kosong)
    op.alter_column('tasks', 'location', nullable=True)

    # 2. Tipe kerja
    op.add_column(
        'tasks',
        sa.Column('work_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )

    # 3. Satuan upah
    op.add_column(
        'tasks',
        sa.Column('wage_rate', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )

    # 4. Batas akhir pendaftaran (with timezone)
    op.add_column(
        'tasks',
        sa.Column('application_deadline', sa.DateTime(timezone=True), nullable=True),
    )

    # 5. Jadwal: tanggal pelaksanaan (kerja terjadwal)
    op.add_column(
        'tasks',
        sa.Column('work_date', sa.Date(), nullable=True),
    )

    # 6. Jadwal: jam mulai pelaksanaan
    op.add_column(
        'tasks',
        sa.Column('work_time_start', sa.Time(), nullable=True),
    )

    # 7. Jadwal: jam selesai pelaksanaan
    op.add_column(
        'tasks',
        sa.Column('work_time_end', sa.Time(), nullable=True),
    )

    # 8. Durasi pengerjaan proyek (N hari kalender setelah assignment dibuat)
    op.add_column(
        'tasks',
        sa.Column('work_deadline_days', sa.SmallInteger(), nullable=True),
    )

    # 9. Keahlian yang dibutuhkan (teks bebas)
    op.add_column(
        'tasks',
        sa.Column('required_skills', sa.Text(), nullable=True),
    )

    # 10. Persyaratan terstruktur (JSON string list, contoh: ["own_vehicle","own_device"])
    op.add_column(
        'tasks',
        sa.Column('requirements_flags', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )

    # 11. Catatan persyaratan tambahan (teks bebas opsional)
    op.add_column(
        'tasks',
        sa.Column('requirements_note', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('tasks', 'requirements_note')
    op.drop_column('tasks', 'requirements_flags')
    op.drop_column('tasks', 'required_skills')
    op.drop_column('tasks', 'work_deadline_days')
    op.drop_column('tasks', 'work_time_end')
    op.drop_column('tasks', 'work_time_start')
    op.drop_column('tasks', 'work_date')
    op.drop_column('tasks', 'application_deadline')
    op.drop_column('tasks', 'wage_rate')
    op.drop_column('tasks', 'work_type')
    # Kembalikan location menjadi NOT NULL
    # (aman: semua task lama sudah punya nilai)
    op.alter_column('tasks', 'location', nullable=False)
