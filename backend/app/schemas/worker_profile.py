"""
Schema untuk WorkerProfile.

Konvensi multi-select:
- Input  (Create / Update) : list[str] | None
- Storage (DB)             : JSON string, contoh '["cash","transfer_bank"]'
- Output (Response)        : list[str] | None  (di-parse dari JSON string)

Konversi antara list dan JSON string dilakukan di router, bukan di schema,
agar schema tetap mendeskripsikan kontrak API yang bersih.
"""

import json
from datetime import date
from uuid import UUID

from pydantic import BaseModel, field_validator


# ── Nilai yang valid ───────────────────────────────────────────────────────────

VALID_STATUS_PEKERJAAN = frozenset(
    {"Mahasiswa", "Pelajar", "Freelancer", "Gap Year", "Lainnya"}
)
VALID_KOMITMEN_JAM = frozenset(
    {"10-15 jam/minggu", "15-20 jam/minggu", ">20 jam/minggu"}
)
VALID_PREFERENSI_SHIFT = frozenset({"pagi", "siang", "malam", "akhir_pekan"})
VALID_HARI = frozenset(
    {"Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}
)
VALID_PAYMENT_METHODS = frozenset({"cash", "transfer_bank", "e_wallet"})


# ── Helper ─────────────────────────────────────────────────────────────────────

def list_to_json(value: list[str] | None) -> str | None:
    """Konversi list ke JSON string untuk disimpan di kolom TEXT."""
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def json_to_list(value: str | None) -> list[str] | None:
    """Parse JSON string (atau comma-separated lama) dari DB menjadi list."""
    if value is None:
        return None
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    # Fallback untuk data lama yang tersimpan sebagai comma-separated
    return [x.strip() for x in value.split(",") if x.strip()]


# ── Schema Input — Worker ──────────────────────────────────────────────────────

class WorkerProfileCreate(BaseModel):
    # Informasi pribadi
    nickname: str | None = None
    location: str | None = None

    # Bio & keahlian
    bio: str | None = None
    skills: list[str] | None = None

    # Status & ketersediaan
    status_pekerjaan: str | None = None
    komitmen_jam: str | None = None
    preferensi_shift: list[str] | None = None
    hari_tersedia: list[str] | None = None
    tanggal_mulai: date | None = None

    # Metode pembayaran
    accepted_payment_methods: list[str] | None = None

    @field_validator("status_pekerjaan")
    @classmethod
    def validate_status_pekerjaan(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_STATUS_PEKERJAAN:
            raise ValueError(
                f"Tidak valid. Pilihan: {sorted(VALID_STATUS_PEKERJAAN)}"
            )
        return v

    @field_validator("komitmen_jam")
    @classmethod
    def validate_komitmen_jam(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_KOMITMEN_JAM:
            raise ValueError(
                f"Tidak valid. Pilihan: {sorted(VALID_KOMITMEN_JAM)}"
            )
        return v

    @field_validator("preferensi_shift")
    @classmethod
    def validate_preferensi_shift(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            # Normalize ke lowercase sebelum validasi
            v = [x.lower() for x in v]
            invalid = set(v) - VALID_PREFERENSI_SHIFT
            if invalid:
                raise ValueError(
                    f"Nilai tidak valid: {invalid}. "
                    f"Pilihan: {sorted(VALID_PREFERENSI_SHIFT)}"
                )
        return v

    @field_validator("hari_tersedia")
    @classmethod
    def validate_hari_tersedia(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            invalid = set(v) - VALID_HARI
            if invalid:
                raise ValueError(
                    f"Nilai tidak valid: {invalid}. Pilihan: {sorted(VALID_HARI)}"
                )
        return v

    @field_validator("accepted_payment_methods")
    @classmethod
    def validate_payment_methods(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            # Normalize ke lowercase sebelum validasi
            v = [x.lower() for x in v]
            invalid = set(v) - VALID_PAYMENT_METHODS
            if invalid:
                raise ValueError(
                    f"Nilai tidak valid: {invalid}. "
                    f"Pilihan: {sorted(VALID_PAYMENT_METHODS)}"
                )
        return v


class WorkerProfileUpdate(WorkerProfileCreate):
    """
    Schema update profil Worker.

    Mewarisi semua field dan validator dari WorkerProfileCreate.
    Semua field opsional — router menggunakan model_dump(exclude_unset=True)
    sehingga hanya field yang dikirim dalam request yang diperbarui.
    """
    pass


# ── Schema Response — Worker ───────────────────────────────────────────────────

class WorkerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    nickname: str | None = None
    location: str | None = None
    bio: str | None = None
    skills: list[str] | None = None
    status_pekerjaan: str | None = None
    komitmen_jam: str | None = None
    preferensi_shift: list[str] | None = None
    hari_tersedia: list[str] | None = None
    tanggal_mulai: date | None = None
    accepted_payment_methods: list[str] | None = None
    rating_avg: float

    model_config = {"from_attributes": True}

    @field_validator(
        "skills",
        "preferensi_shift",
        "hari_tersedia",
        "accepted_payment_methods",
        mode="before",
    )
    @classmethod
    def _parse_json_list(cls, v) -> list[str] | None:
        """Parse JSON string dari DB menjadi list saat membentuk response."""
        return json_to_list(v)
