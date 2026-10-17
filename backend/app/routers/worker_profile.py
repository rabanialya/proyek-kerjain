from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.worker_profile import (
    WorkerProfileCreate,
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


@router.post(
    "",
    response_model=WorkerProfileResponse,
    status_code=201
)
def create_worker_profile(
    data: WorkerProfileCreate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    existing = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Worker profile sudah ada. Gunakan PUT untuk memperbarui."
        )

    profile = WorkerProfile(
        user_id=current_user.id,
        bio=data.bio,
        skills=data.skills,
        accepted_payment_methods=data.accepted_payment_methods,
    )

    session.add(profile)
    session.commit()
    session.refresh(profile)

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
        raise HTTPException(
            status_code=404,
            detail="Worker profile belum dibuat. Gunakan POST untuk membuat profil baru."
        )

    # Hanya update field yang benar-benar dikirim dalam request.
    # Field yang tidak disertakan tidak akan menimpa nilai yang sudah ada.
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    session.commit()
    session.refresh(profile)

    return profile
