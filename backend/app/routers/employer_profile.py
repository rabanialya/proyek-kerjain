from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.models.employer_profile import EmployerProfile
from app.models.user import User
from app.schemas.employer_profile import (
    EmployerProfileCreate,
    EmployerProfileResponse,
    EmployerProfileUpdate,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles/employer",
    tags=["Employer Profile"]
)


@router.get(
    "",
    response_model=EmployerProfileResponse
)
def get_employer_profile(
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Employer profile belum dibuat"
        )

    return profile


@router.post(
    "",
    response_model=EmployerProfileResponse,
    status_code=201
)
def create_employer_profile(
    data: EmployerProfileCreate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    existing = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Employer profile sudah ada. Gunakan PUT untuk memperbarui."
        )

    profile = EmployerProfile(
        user_id=current_user.id,
        display_name=data.display_name,
        description=data.description,
    )

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return profile


@router.put(
    "",
    response_model=EmployerProfileResponse
)
def update_employer_profile(
    data: EmployerProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Employer profile belum dibuat. Gunakan POST untuk membuat profil baru."
        )

    # Hanya update field yang benar-benar dikirim dalam request
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    # Pastikan display_name tidak pernah di-set ke None setelah update
    if profile.display_name is None:
        raise HTTPException(
            status_code=422,
            detail="display_name tidak boleh dihapus setelah profil dibuat"
        )

    session.commit()
    session.refresh(profile)

    return profile
