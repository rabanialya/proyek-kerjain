"""
Schema Pydantic untuk Task.

Aturan field baru:
- Semua field baru optional di TaskCreate dan TaskUpdate.
- Draft boleh disimpan tanpa field baru — tidak ada yang wajib saat create.
- Validasi kondisional (work_type, location, dsb.) dilakukan di router,
  bukan di schema, karena bergantung pada konteks (draft vs publish).
- work_type   : None = belum ditentukan (data lama aman).
- wage_rate   : None = belum ditentukan (data lama aman).
- location    : None diizinkan untuk tipe remote.
"""

import json
from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

# Nilai valid untuk work_type dan wage_rate.
# Digunakan juga di router untuk validasi kondisional.
VALID_WORK_TYPES = {"remote", "on_site", "hybrid"}
VALID_WAGE_RATES = {"project", "hourly", "daily", "per_output"}
VALID_REQUIREMENT_FLAGS = {
    "own_vehicle",
    "own_device",
    "local_domicile",
    "minimum_age_18",
    "no_criminal_record",
}


class TaskCreate(BaseModel):
    # ── Informasi dasar ────────────────────────────────────────────────
    category_id: UUID
    title: str = Field(min_length=3, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    # ── Tipe kerja & lokasi ────────────────────────────────────────────
    work_type: str | None = None
    location: str | None = Field(default=None, max_length=120)

    # ── Worker & upah ─────────────────────────────────────────────────
    worker_needed: int = Field(default=1, ge=1)
    wage_amount: Decimal = Field(gt=0)
    wage_rate: str | None = None
    payment_method: str

    # ── Deadline pendaftaran ───────────────────────────────────────────
    application_deadline: datetime | None = None

    # ── Jadwal: kerja terjadwal ────────────────────────────────────────
    work_date: date | None = None
    work_time_start: time | None = None
    work_time_end: time | None = None

    # ── Jadwal: kerja berbasis proyek ──────────────────────────────────
    work_deadline_days: int | None = Field(default=None, ge=1, le=365)

    # ── Persyaratan ────────────────────────────────────────────────────
    required_skills: str | None = None
    requirements_flags: str | None = None   # JSON string list
    requirements_note: str | None = None

    # ── Validasi enum ──────────────────────────────────────────────────

    @field_validator("work_type")
    @classmethod
    def validate_work_type(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_WORK_TYPES:
            raise ValueError(
                f"work_type harus salah satu dari: {', '.join(sorted(VALID_WORK_TYPES))}"
            )
        return v

    @field_validator("wage_rate")
    @classmethod
    def validate_wage_rate(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_WAGE_RATES:
            raise ValueError(
                f"wage_rate harus salah satu dari: {', '.join(sorted(VALID_WAGE_RATES))}"
            )
        return v

    @field_validator("requirements_flags")
    @classmethod
    def validate_requirements_flags(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            parsed = json.loads(v)
        except (json.JSONDecodeError, ValueError):
            raise ValueError("requirements_flags harus berupa JSON string yang valid")
        if not isinstance(parsed, list):
            raise ValueError("requirements_flags harus berupa JSON array")
        invalid = set(parsed) - VALID_REQUIREMENT_FLAGS
        if invalid:
            raise ValueError(
                f"requirements_flags mengandung nilai tidak valid: {invalid}. "
                f"Nilai yang diizinkan: {VALID_REQUIREMENT_FLAGS}"
            )
        return v


class TaskUpdate(BaseModel):
    # ── Informasi dasar ────────────────────────────────────────────────
    category_id: UUID | None = None
    title: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = None

    # ── Tipe kerja & lokasi ────────────────────────────────────────────
    work_type: str | None = None
    location: str | None = Field(default=None, max_length=120)

    # ── Worker & upah ─────────────────────────────────────────────────
    worker_needed: int | None = Field(default=None, ge=1)
    wage_amount: Decimal | None = Field(default=None, gt=0)
    wage_rate: str | None = None
    payment_method: str | None = None

    # ── Deadline pendaftaran ───────────────────────────────────────────
    application_deadline: datetime | None = None

    # ── Jadwal: kerja terjadwal ────────────────────────────────────────
    work_date: date | None = None
    work_time_start: time | None = None
    work_time_end: time | None = None

    # ── Jadwal: kerja berbasis proyek ──────────────────────────────────
    work_deadline_days: int | None = Field(default=None, ge=1, le=365)

    # ── Persyaratan ────────────────────────────────────────────────────
    required_skills: str | None = None
    requirements_flags: str | None = None
    requirements_note: str | None = None

    # ── Validasi enum (sama dengan TaskCreate) ─────────────────────────

    @field_validator("work_type")
    @classmethod
    def validate_work_type(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_WORK_TYPES:
            raise ValueError(
                f"work_type harus salah satu dari: {', '.join(sorted(VALID_WORK_TYPES))}"
            )
        return v

    @field_validator("wage_rate")
    @classmethod
    def validate_wage_rate(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_WAGE_RATES:
            raise ValueError(
                f"wage_rate harus salah satu dari: {', '.join(sorted(VALID_WAGE_RATES))}"
            )
        return v

    @field_validator("requirements_flags")
    @classmethod
    def validate_requirements_flags(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            parsed = json.loads(v)
        except (json.JSONDecodeError, ValueError):
            raise ValueError("requirements_flags harus berupa JSON string yang valid")
        if not isinstance(parsed, list):
            raise ValueError("requirements_flags harus berupa JSON array")
        invalid = set(parsed) - VALID_REQUIREMENT_FLAGS
        if invalid:
            raise ValueError(
                f"requirements_flags mengandung nilai tidak valid: {invalid}. "
                f"Nilai yang diizinkan: {VALID_REQUIREMENT_FLAGS}"
            )
        return v


class TaskResponse(BaseModel):
    id: UUID
    employer_id: UUID
    category_id: UUID

    # ── Informasi dasar ────────────────────────────────────────────────
    title: str
    description: str | None = None

    # ── Tipe kerja & lokasi ────────────────────────────────────────────
    # Nullable agar task lama (tanpa work_type) tidak menyebabkan error serialisasi.
    work_type: str | None = None
    location: str | None = None

    # ── Worker & upah ─────────────────────────────────────────────────
    worker_needed: int
    wage_amount: Decimal
    wage_rate: str | None = None
    payment_method: str

    # ── Deadline pendaftaran ───────────────────────────────────────────
    application_deadline: datetime | None = None

    # ── Jadwal: kerja terjadwal ────────────────────────────────────────
    work_date: date | None = None
    work_time_start: time | None = None
    work_time_end: time | None = None

    # ── Jadwal: kerja berbasis proyek ──────────────────────────────────
    work_deadline_days: int | None = None

    # ── Persyaratan ────────────────────────────────────────────────────
    required_skills: str | None = None
    requirements_flags: str | None = None
    requirements_note: str | None = None

    # ── Status & timestamps ────────────────────────────────────────────
    status: str
    created_at: datetime
    published_at: datetime | None = None
    updated_at: datetime

    class Config:
        from_attributes = True
