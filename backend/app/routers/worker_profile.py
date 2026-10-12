from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.worker_profile import (
    WorkerProfileResponse,
    WorkerProfileUpdate,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles/worker",
    tags=["Worker Profile"]
)


@router.get(
    "",
    response_model=WorkerProfileResponse
)
def get_worker_profile(
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Worker profile belum dibuat"
        )

    return profile


@router.put(
    "",
    response_model=WorkerProfileResponse
)
def update_worker_profile(
    data: WorkerProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if not profile:
        profile = WorkerProfile(
            user_id=current_user.id,
            bio=data.bio,
            skills=data.skills,
            accepted_payment_methods=data.accepted_payment_methods,
        )

        session.add(profile)

    else:
        profile.bio = data.bio
        profile.skills = data.skills
        profile.accepted_payment_methods = data.accepted_payment_methods

    session.commit()
    session.refresh(profile)

    return profile