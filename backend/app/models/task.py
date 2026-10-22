from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    employer_id: UUID = Field(
        foreign_key="employer_profiles.id",
        index=True,
    )

    category_id: UUID = Field(
        foreign_key="categories.id",
        index=True,
    )

    # ── Informasi dasar ────────────────────────────────────────────────
    title: str
    description: str | None = None

    # ── Tipe kerja & lokasi ────────────────────────────────────────────
    # work_type: remote | on_site | hybrid | None (belum ditentukan / data lama)
    work_type: str | None = None

    # location nullable: Remote tidak wajib lokasi fisik.
    # Task lama tetap punya nilai; task baru tipe remote boleh kosong.
    location: str | None = None

    # ── Worker & upah ─────────────────────────────────────────────────
    worker_needed: int = Field(default=1)
    wage_amount: Decimal

    # wage_rate: project | hourly | daily | per_output | None (belum ditentukan)
    wage_rate: str | None = None

    payment_method: str

    # ── Deadline pendaftaran ───────────────────────────────────────────
    # Divalidasi saat publish dan saat worker melamar.
    # Disimpan dengan timezone (UTC).
    application_deadline: datetime | None = None

    # ── Jadwal — kerja terjadwal ───────────────────────────────────────
    # Tanggal dan jam pelaksanaan (untuk pekerjaan dengan jadwal tetap).
    work_date: date | None = None
    work_time_start: time | None = None
    work_time_end: time | None = None

    # ── Jadwal — kerja berbasis proyek ─────────────────────────────────
    # N hari kalender setelah assignment dibuat.
    # Nilai aktual disalin ke assignments.deadline_at saat assignment dibuat
    # dan tidak berubah meskipun field ini diubah kemudian.
    work_deadline_days: int | None = None

    # ── Persyaratan ────────────────────────────────────────────────────
    # Keahlian yang dibutuhkan (teks bebas).
    required_skills: str | None = None

    # Persyaratan terstruktur: JSON string list.
    # Nilai yang diizinkan: own_vehicle, own_device, local_domicile,
    #                       minimum_age_18, no_criminal_record
    # Contoh: '["own_vehicle","local_domicile"]'
    requirements_flags: str | None = None

    # Catatan persyaratan tambahan (teks bebas opsional).
    requirements_note: str | None = None

    # ── Status & timestamps ────────────────────────────────────────────
    status: str = Field(default="draft")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    published_at: datetime | None = None

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
