from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.dispute import Dispute
from app.models.assignment import Assignment
from app.models.application import Application
from app.models.task import Task
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.models.employer_profile import EmployerProfile

from app.schemas.dispute import (
    DisputeCreate,
    DisputeResolve,
    DisputeResponse,
)

from app.utils.dependencies import (
    get_current_user,
    get_session,
)


router = APIRouter(
    prefix="/disputes",
    tags=["Dispute"]
)


# =========================================================
# CREATE DISPUTE
# =========================================================

@router.post(
    "",
    response_model=DisputeResponse,
    status_code=201
)
def create_dispute(
    dispute_data: DisputeCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # -----------------------------------------------------
    # Cari assignment
    # -----------------------------------------------------

    assignment = session.get(
        Assignment,
        dispute_data.assignment_id
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Dispute hanya dapat dibuat sebelum assignment approved
    # -----------------------------------------------------

    if assignment.status in {"approved", "disputed"}:
        raise HTTPException(
            status_code=400,
            detail="Assignment tidak dapat dibuat dispute pada status saat ini"
        )

    # -----------------------------------------------------
    # Cari application
    # -----------------------------------------------------

    application = session.get(
        Application,
        assignment.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari task
    # -----------------------------------------------------

    task = session.get(
        Task,
        application.task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari Worker Profile
    # -----------------------------------------------------

    worker_profile = session.get(
        WorkerProfile,
        application.worker_id
    )

    # -----------------------------------------------------
    # Cari Employer Profile
    # -----------------------------------------------------

    employer_profile = session.get(
        EmployerProfile,
        task.employer_id
    )

    if not worker_profile or not employer_profile:
        raise HTTPException(
            status_code=404,
            detail="Profile terkait assignment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cek apakah user terlibat dalam assignment
    # -----------------------------------------------------

    is_worker = (
        current_user.id == worker_profile.user_id
    )

    is_employer = (
        current_user.id == employer_profile.user_id
    )

    if not is_worker and not is_employer:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak terlibat dalam assignment ini"
        )

    # -----------------------------------------------------
    # Cek dispute yang masih open
    # -----------------------------------------------------

    existing_dispute = session.exec(
        select(Dispute).where(
            Dispute.assignment_id == assignment.id,
            Dispute.status == "open"
        )
    ).first()

    if existing_dispute:
        raise HTTPException(
            status_code=400,
            detail="Assignment ini sudah memiliki dispute yang masih terbuka"
        )

    # -----------------------------------------------------
    # Buat dispute
    # -----------------------------------------------------

    dispute = Dispute(
        assignment_id=assignment.id,
        raised_by=current_user.id,
        reason=dispute_data.reason,
        description=dispute_data.description,
        status="open",
    )

    session.add(dispute)

    # -----------------------------------------------------
    # Assignment menjadi disputed
    # -----------------------------------------------------

    assignment.status = "disputed"
    assignment.updated_at = datetime.now(timezone.utc)

    session.add(assignment)

    session.commit()
    session.refresh(dispute)

    return dispute


# =========================================================
# GET MY DISPUTES
# =========================================================

@router.get(
    "/my",
    response_model=list[DisputeResponse]
)
def get_my_disputes(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    disputes = session.exec(
        select(Dispute).where(
            Dispute.raised_by == current_user.id
        )
    ).all()

    return disputes


# =========================================================
# GET DISPUTE DETAIL
# =========================================================

@router.get(
    "/{dispute_id}",
    response_model=DisputeResponse
)
def get_dispute(
    dispute_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    dispute = session.get(
        Dispute,
        dispute_id
    )

    if not dispute:
        raise HTTPException(
            status_code=404,
            detail="Dispute tidak ditemukan"
        )

    assignment = session.get(
        Assignment,
        dispute.assignment_id
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    application = session.get(
        Application,
        assignment.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    task = session.get(
        Task,
        application.task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    worker_profile = session.get(
        WorkerProfile,
        application.worker_id
    )

    employer_profile = session.get(
        EmployerProfile,
        task.employer_id
    )

    if not worker_profile or not employer_profile:
        raise HTTPException(
            status_code=404,
            detail="Profile terkait assignment tidak ditemukan"
        )

    is_worker = (
        current_user.id == worker_profile.user_id
    )

    is_employer = (
        current_user.id == employer_profile.user_id
    )

    if not is_worker and not is_employer:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke dispute ini"
        )

    return dispute