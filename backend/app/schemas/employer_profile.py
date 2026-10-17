"""
Schema untuk EmployerProfile.

Konvensi multi-select:
- Input  (Create / Update) : list[str] | None
- Storage (DB)             : JSON string, contoh '["remote","on_site"]'
- Output (Response)        : list[str] | None  (di-parse dari JSON string)

Konversi antara list dan JSON string dilakukan di router.
Field sistem (is_verified, rating_avg) tidak dapat diubah melalui form profil.
"""

import json
from uuid import UUID

from pydantic import BaseModel, field_validator


# ── Nilai yang valid ───────────────────────────────────────────────────────────

VALID_TIPE_EMPLOYER = frozenset(
    {"Perusahaan", "UMKM", "Usaha Mandiri", "Perorangan"}
)
VALID_WORK_TYPE = frozenset({"remote", "on_site", "hybrid"})
VALID_PAYMENT_SCHEME = frozenset({"per_jam", "per_hari", "per_proyek", "bulanan"})


# ── Helper ─────────────────────────────────────────────────────────────────────

def list_to_json(value: list[str] | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def json_to_list(value: str | None) -> list[str] | None:
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
    return [x.strip() for x in value.split(",") if x.strip()]


# ── Schema Input — Employer ────────────────────────────────────────────────────

class EmployerProfileCreate(BaseModel):
    # Identitas utama
    display_name: str
    tipe_employer: str | None = None
    sektor: str | None = None
    tagline: str | None = None
    description: str | None = None
    location: str | None = None

    # Kontak
    contact_email: str | None = None
    whatsapp: str | None = None
    website: str | None = None

    # Format kerja
    work_type: list[str] | None = None
    work_address: str | None = None

    # Kebijakan pembayaran
    payment_scheme: list[str] | None = None
    payment_schedule: str | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "display_name tidak boleh kosong atau hanya berisi spasi"
            )
        return v.strip()

    @field_validator("tipe_employer")
    @classmethod
    def validate_tipe(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_TIPE_EMPLOYER:
            raise ValueError(
                f"tipe_employer tidak valid. Pilihan: {sorted(VALID_TIPE_EMPLOYER)}"
            )
        return v

    @field_validator("work_type")
    @classmethod
    def validate_work_type(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            invalid = set(v) - VALID_WORK_TYPE
            if invalid:
                raise ValueError(
                    f"work_type mengandung nilai tidak valid: {invalid}. "
                    f"Pilihan: {sorted(VALID_WORK_TYPE)}"
                )
        return v

    @field_validator("payment_scheme")
    @classmethod
    def validate_payment_scheme(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            invalid = set(v) - VALID_PAYMENT_SCHEME
            if invalid:
                raise ValueError(
                    f"payment_scheme mengandung nilai tidak valid: {invalid}. "
                    f"Pilihan: {sorted(VALID_PAYMENT_SCHEME)}"
                )
        return v


class EmployerProfileUpdate(BaseModel):
    """
    Schema update profil Employer.

    display_name opsional saat update, tapi tidak boleh berupa string kosong/spasi
    jika dikirim. Router menggunakan model_dump(exclude_unset=True).
    """

    # Identitas
    display_name: str | None = None
    tipe_employer: str | None = None
    sektor: str | None = None
    tagline: str | None = None
    description: str | None = None
    location: str | None = None

    # Kontak
    contact_email: str | None = None
    whatsapp: str | None = None
    website: str | None = None

    # Format kerja
    work_type: list[str] | None = None
    work_address: str | None = None

    # Kebijakan pembayaran
    payment_scheme: list[str] | None = None
    payment_schedule: str | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(
                "display_name tidak boleh berupa string kosong atau hanya berisi spasi"
            )
        if v is not None:
            return v.strip()
        return v

    @field_validator("tipe_employer")
    @classmethod
    def validate_tipe(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_TIPE_EMPLOYER:
            raise ValueError(
                f"tipe_employer tidak valid. Pilihan: {sorted(VALID_TIPE_EMPLOYER)}"
            )
        return v

    @field_validator("work_type")
    @classmethod
    def validate_work_type(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            invalid = set(v) - VALID_WORK_TYPE
            if invalid:
                raise ValueError(
                    f"work_type mengandung nilai tidak valid: {invalid}. "
                    f"Pilihan: {sorted(VALID_WORK_TYPE)}"
                )
        return v

    @field_validator("payment_scheme")
    @classmethod
    def validate_payment_scheme(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            invalid = set(v) - VALID_PAYMENT_SCHEME
            if invalid:
                raise ValueError(
                    f"payment_scheme mengandung nilai tidak valid: {invalid}. "
                    f"Pilihan: {sorted(VALID_PAYMENT_SCHEME)}"
                )
        return v


# ── Schema Response — Employer ─────────────────────────────────────────────────

class EmployerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    tipe_employer: str | None = None
    sektor: str | None = None
    tagline: str | None = None
    description: str | None = None
    location: str | None = None
    contact_email: str | None = None
    whatsapp: str | None = None
    website: str | None = None
    work_type: list[str] | None = None
    work_address: str | None = None
    payment_scheme: list[str] | None = None
    payment_schedule: str | None = None
    is_verified: bool
    rating_avg: float

    model_config = {"from_attributes": True}

    @field_validator("work_type", "payment_scheme", mode="before")
    @classmethod
    def _parse_json_list(cls, v) -> list[str] | None:
        """Parse JSON string dari DB menjadi list saat membentuk response."""
        return json_to_list(v)
