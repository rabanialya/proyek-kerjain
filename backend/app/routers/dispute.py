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
    DisputeResponse,
)

from app.services import create_notification, log_activity
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
# Kebijakan:
#   - Hanya Employer pemilik task yang dapat mengajukan dispute.
#   - Assignment harus berstatus "submitted".
#   - Tidak boleh ada dispute "open" yang sudah ada untuk assignment tsb.
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
    # ---------------------------------------------------------
    # Cari assignment
    # ---------------------------------------------------------

    assignment = session.get(Assignment, dispute_data.assignment_id)

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    # ---------------------------------------------------------
    # Dispute hanya dapat dibuat dari status "submitted"
    # ---------------------------------------------------------

    if assignment.status != "submitted":
        raise HTTPException(
            status_code=400,
            detail=(
                "Dispute hanya dapat diajukan ketika assignment berstatus 'submitted'. "
                f"Status saat ini: '{assignment.status}'"
            )
        )

    # ---------------------------------------------------------
    # Cari application → task
    # ---------------------------------------------------------

    application = session.get(Application, assignment.application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application tidak ditemukan")

    task = session.get(Task, application.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    # ---------------------------------------------------------
    # Hanya Employer pemilik task yang boleh mengajukan dispute
    # ---------------------------------------------------------

    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not employer_profile or task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Hanya Employer pemilik task yang dapat mengajukan dispute"
        )

    # ---------------------------------------------------------
    # Cek dispute yang masih open untuk assignment ini
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Buat dispute
    # ---------------------------------------------------------

    dispute = Dispute(
        assignment_id=assignment.id,
        raised_by=current_user.id,
        reason=dispute_data.reason,
        description=dispute_data.description,
        status="open",
    )

    session.add(dispute)

    # ---------------------------------------------------------
    # Assignment → "disputed"
    # Pembayaran dan pencairan diblokir selama status ini.
    # ---------------------------------------------------------

    assignment.status = "disputed"
    assignment.updated_at = datetime.now(timezone.utc)
    session.add(assignment)

    # ── Notifikasi ke Worker terkait + Activity Log (actor: Employer) ──
    # Penerima: application.worker_id -> WorkerProfile.user_id. Satu transaksi
    # dengan dispute & perubahan status assignment.
    worker_profile = session.get(WorkerProfile, application.worker_id)
    if worker_profile is None:
        raise HTTPException(
            status_code=500,
            detail="Profil Worker tidak ditemukan",
        )

    create_notification(
        session,
        user_id=worker_profile.user_id,
        title="Dispute diajukan pada pekerjaan Anda",
        message=(
            f"Employer mengajukan dispute untuk pekerjaan Anda pada task "
            f"\"{task.title}\". Silakan lihat detail dispute."
        ),
        entity_type="dispute",
        entity_id=dispute.id,
    )
    log_activity(
        session,
        user_id=current_user.id,
        entity_type="dispute",
        entity_id=dispute.id,
        action="create_dispute",
        new_value={"status": "open", "assignment_status": "disputed"},
    )

    session.commit()
    session.refresh(dispute)

    return dispute


# =========================================================
# GET MY DISPUTES  (Employer yang mengajukan)
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
# Dapat diakses oleh Employer pemilik task atau Worker terkait.
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
    dispute = session.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute tidak ditemukan")

    assignment = session.get(Assignment, dispute.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment tidak ditemukan")

    application = session.get(Application, assignment.application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application tidak ditemukan")

    task = session.get(Task, application.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    # Cek akses: Employer pemilik task
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()
    is_employer = (
        employer_profile is not None
        and task.employer_id == employer_profile.id
    )

    # Cek akses: Worker terkait assignment
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()
    is_worker = (
        worker_profile is not None
        and application.worker_id == worker_profile.id
    )

    if not is_employer and not is_worker:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke dispute ini"
        )

    return dispute
