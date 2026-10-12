from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.models.employer_profile import EmployerProfile
from app.models.user import User
from app.schemas.employer_profile import (
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
        profile = EmployerProfile(
            user_id=current_user.id,
            display_name=data.display_name,
            description=data.description,
        )

        session.add(profile)

    else:
        profile.display_name = data.display_name
        profile.description = data.description

    session.commit()
    session.refresh(profile)

    return profile