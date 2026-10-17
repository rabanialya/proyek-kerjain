from fastapi import APIRouter, Depends
from sqlmodel import Session as SQLModelSession, select

from app.models.employer_profile import EmployerProfile
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.employer_profile import EmployerProfileResponse
from app.schemas.worker_profile import WorkerProfileResponse
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles",
    tags=["Profiles"]
)


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
