from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.models.employer_profile import EmployerProfile
from app.models.user import User
from app.schemas.employer_profile import (
    EmployerProfileCreate,
    EmployerProfileResponse,
    EmployerProfileUpdate,
    list_to_json,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles/employer",
    tags=["Employer Profile"]
)

# Field yang disimpan sebagai JSON string di DB (input: list[str] | None)
_JSON_LIST_FIELDS = frozenset({"work_type", "payment_scheme"})


def _apply_data_to_profile(profile: EmployerProfile, data: dict) -> None:
    """
    Terapkan dict data ke atribut model EmployerProfile.

    Field multi-select (list) dikonversi ke JSON string sebelum disimpan.
    Field sistem (is_verified, rating_avg) tidak boleh ada dalam data input.
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
    response_model=EmployerProfileResponse,
    summary="Ambil profil Employer milik user yang sedang login",
)
def get_employer_profile(
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(EmployerProfile).where(EmployerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Employer profile belum dibuat")

    return profile


# ── POST — buat profil baru ───────────────────────────────────────────────────

@router.post(
    "",
    response_model=EmployerProfileResponse,
    status_code=201,
    summary="Buat profil Employer baru",
)
def create_employer_profile(
    data: EmployerProfileCreate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    existing = session.exec(
        select(EmployerProfile).where(EmployerProfile.user_id == current_user.id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Employer profile sudah ada. Gunakan PUT untuk memperbarui.",
        )

    profile = EmployerProfile(user_id=current_user.id, display_name=data.display_name)
    _apply_data_to_profile(profile, data.model_dump(exclude_unset=False))

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return profile


# ── PUT — perbarui profil (partial update) ────────────────────────────────────

@router.put(
    "",
    response_model=EmployerProfileResponse,
    summary="Perbarui profil Employer (partial update — hanya field yang dikirim yang berubah)",
)
def update_employer_profile(
    data: EmployerProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(EmployerProfile).where(EmployerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Employer profile belum dibuat. Gunakan POST untuk membuat profil baru.",
        )

    update_data = data.model_dump(exclude_unset=True)
    _apply_data_to_profile(profile, update_data)

    # Pastikan display_name tidak pernah menjadi None setelah update
    if profile.display_name is None:
        raise HTTPException(
            status_code=422,
            detail="display_name tidak boleh dihapus setelah profil dibuat",
        )

    session.commit()
    session.refresh(profile)

    return profile
