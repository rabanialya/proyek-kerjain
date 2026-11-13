from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlmodel import Session as SQLModelSession, select

from app.models.employer_profile import EmployerProfile
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.employer_profile import EmployerProfileResponse
from app.schemas.worker_profile import WorkerProfileResponse, json_to_list
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles",
    tags=["Profiles"]
)


# ── Schema Public — Worker ─────────────────────────────────────────────────────

class PublicWorkerProfileResponse(BaseModel):
    """
    Profil publik Worker — hanya berisi informasi yang layak ditampilkan ke pengguna lain.
    Tidak mengandung email, nomor telepon, atau informasi sensitif lainnya.
    """
    id: UUID
    # user_id dibutuhkan oleh fitur Report agar pelapor dapat mengirim reported_user_id
    user_id: UUID
    full_name: str
    avatar_url: str | None = None
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
        return json_to_list(v)


# ── Schema Public — Employer ───────────────────────────────────────────────────

class PublicEmployerProfileResponse(BaseModel):
    """
    Profil publik Employer — hanya berisi informasi yang layak ditampilkan ke pengguna lain.
    Tidak mengandung contact_email, whatsapp, atau informasi kontak pribadi lainnya.
    """
    id: UUID
    # user_id dibutuhkan oleh fitur Report agar pelapor dapat mengirim reported_user_id
    user_id: UUID
    display_name: str
    avatar_url: str | None = None
    tipe_employer: str | None = None
    sektor: str | None = None
    tagline: str | None = None
    description: str | None = None
    location: str | None = None
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
        from app.schemas.employer_profile import json_to_list as emp_json_to_list
        return emp_json_to_list(v)


# ── Endpoint status (sudah ada) ────────────────────────────────────────────────

class ProfileStatusResponse:
    """Digunakan hanya sebagai dokumentasi — response dikembalikan sebagai dict."""
    pass


@router.get(
    "/status",
    summary="Cek status profil Worker dan Employer milik user yang sedang login",
    response_model=dict
)
def get_profile_status(
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    """
    Mengembalikan status profil Worker dan Employer untuk user yang sedang login.

    - Jika profil belum dibuat, nilainya `null`.
    - Jika profil sudah ada, objek profil dikembalikan.
    - Tidak pernah mengembalikan HTTP 404 — kondisi belum punya profil adalah normal.
    """
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    return {
        "worker_profile": WorkerProfileResponse.model_validate(
            worker_profile, from_attributes=True
        ) if worker_profile else None,
        "employer_profile": EmployerProfileResponse.model_validate(
            employer_profile, from_attributes=True
        ) if employer_profile else None,
    }


# ── Endpoint Public Profile ────────────────────────────────────────────────────

@router.get(
    "/worker/{profile_id}/public",
    response_model=PublicWorkerProfileResponse,
    summary="Ambil profil publik Worker berdasarkan WorkerProfile ID",
)
def get_public_worker_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    """
    Mengembalikan informasi publik profil Worker berdasarkan `WorkerProfile.id`.

    - Membutuhkan autentikasi (pengguna harus login).
    - Mengembalikan 404 jika profil tidak ditemukan atau pengguna tidak aktif.
    - Tidak mengekspos email, nomor telepon, atau data sensitif lainnya.
    """
    profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.id == profile_id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil Worker tidak ditemukan.")

    user = session.exec(
        select(User).where(User.id == profile.user_id)
    ).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Profil Worker tidak ditemukan.")

    return PublicWorkerProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        nickname=profile.nickname,
        location=profile.location,
        bio=profile.bio,
        skills=profile.skills,
        status_pekerjaan=profile.status_pekerjaan,
        komitmen_jam=profile.komitmen_jam,
        preferensi_shift=profile.preferensi_shift,
        hari_tersedia=profile.hari_tersedia,
        tanggal_mulai=profile.tanggal_mulai,
        accepted_payment_methods=profile.accepted_payment_methods,
        rating_avg=profile.rating_avg,
    )


@router.get(
    "/employer/{profile_id}/public",
    response_model=PublicEmployerProfileResponse,
    summary="Ambil profil publik Employer berdasarkan EmployerProfile ID",
)
def get_public_employer_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    """
    Mengembalikan informasi publik profil Employer berdasarkan `EmployerProfile.id`.

    - Membutuhkan autentikasi (pengguna harus login).
    - Mengembalikan 404 jika profil tidak ditemukan atau pengguna tidak aktif.
    - Tidak mengekspos contact_email, whatsapp, atau data kontak pribadi lainnya.
    """
    profile = session.exec(
        select(EmployerProfile).where(EmployerProfile.id == profile_id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profil Employer tidak ditemukan.")

    user = session.exec(
        select(User).where(User.id == profile.user_id)
    ).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Profil Employer tidak ditemukan.")

    return PublicEmployerProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        display_name=profile.display_name,
        avatar_url=user.avatar_url,
        tipe_employer=profile.tipe_employer,
        sektor=profile.sektor,
        tagline=profile.tagline,
        description=profile.description,
        location=profile.location,
        website=profile.website,
        work_type=profile.work_type,
        work_address=profile.work_address,
        payment_scheme=profile.payment_scheme,
        payment_schedule=profile.payment_schedule,
        is_verified=profile.is_verified,
        rating_avg=profile.rating_avg,
    )


# ── Avatar Upload ──────────────────────────────────────────────────────────────

import uuid as _uuid_module
from datetime import datetime, timezone
from pathlib import Path

from fastapi import File, UploadFile

_AVATAR_DIR = Path("_private_uploads") / "avatars"
_AVATAR_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_AVATAR_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp"}
_MAX_AVATAR_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB

_AVATAR_EXT_MAP: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class AvatarUploadResponse(BaseModel):
    avatar_url: str
    message: str = "Foto profil berhasil diperbarui."


@router.post(
    "/avatar",
    response_model=AvatarUploadResponse,
    summary="Upload atau ganti foto profil (avatar) milik user yang sedang login",
)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    """
    Upload gambar sebagai foto profil user.

    - Format yang diterima: JPEG, PNG, WEBP.
    - Ukuran maksimal: 5 MB.
    - Foto disimpan di `_private_uploads/avatars/` dan dilayani via `GET /files/avatar`.
    - `User.avatar_url` diperbarui; foto lama tetap di disk (tidak dihapus otomatis).
    """
    if file.content_type not in _ALLOWED_AVATAR_TYPES:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.",
        )

    contents = file.file.read()
    if len(contents) > _MAX_AVATAR_SIZE_BYTES:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(
            status_code=400,
            detail="Ukuran file melebihi 5 MB.",
        )

    ext = _AVATAR_EXT_MAP.get(file.content_type, ".jpg")
    filename = f"{_uuid_module.uuid4()}{ext}"
    file_path = _AVATAR_DIR / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    stored_url = f"_private_uploads/avatars/{filename}"
    current_user.avatar_url = stored_url
    current_user.updated_at = datetime.now(timezone.utc)
    session.add(current_user)
    session.commit()

    return AvatarUploadResponse(avatar_url=stored_url)
