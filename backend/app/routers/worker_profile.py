from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileResponse,
    WorkerProfileUpdate,
    list_to_json,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles/worker",
    tags=["Worker Profile"]
)

# Field yang disimpan sebagai JSON string di DB (input: list[str] | None)
_JSON_LIST_FIELDS = frozenset(
    {"skills", "preferensi_shift", "hari_tersedia", "accepted_payment_methods"}
)


def _apply_data_to_profile(profile: WorkerProfile, data: dict) -> None:
    """
    Terapkan dict data ke atribut model WorkerProfile.

    Field multi-select (list) dikonversi ke JSON string sebelum disimpan.
    Field lain diset langsung.
    """
    for field, value in data.items():
        if field in _JSON_LIST_FIELDS:
            setattr(profile, field, list_to_json(value))
        else:
            setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)


# ── GET — baca profil ─────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=WorkerProfileResponse,
    summary="Ambil profil Worker milik user yang sedang login",
)
def get_worker_profile(
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile belum dibuat")

    return profile


# ── POST — buat profil baru ───────────────────────────────────────────────────

@router.post(
    "",
    response_model=WorkerProfileResponse,
    status_code=201,
    summary="Buat profil Worker baru",
)
def create_worker_profile(
    data: WorkerProfileCreate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    existing = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Worker profile sudah ada. Gunakan PUT untuk memperbarui.",
        )

    profile = WorkerProfile(user_id=current_user.id)
    _apply_data_to_profile(profile, data.model_dump(exclude_unset=False))

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return profile


# ── PUT — perbarui profil (partial update) ────────────────────────────────────

@router.put(
    "",
    response_model=WorkerProfileResponse,
    summary="Perbarui profil Worker (partial update — hanya field yang dikirim yang berubah)",
)
def update_worker_profile(
    data: WorkerProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Worker profile belum dibuat. Gunakan POST untuk membuat profil baru.",
        )

    # exclude_unset=True: field yang tidak dikirim dalam request tidak disentuh
    _apply_data_to_profile(profile, data.model_dump(exclude_unset=True))

    session.commit()
    session.refresh(profile)

    return profile
