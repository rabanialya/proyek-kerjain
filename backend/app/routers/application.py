from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.application import Application
from app.models.employer_profile import EmployerProfile
from app.models.task import Task
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplicationWithWorkerResponse,
    WorkerSummary,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/applications",
    tags=["Applications"]
)


# ==========================================
# CREATE APPLICATION
# ==========================================

@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=201,
)
def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # 1. Cari Worker Profile milik user yang sedang login
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if not worker_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Worker Profile",
        )

    # 2. Cari task
    task = session.get(Task, data.task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

    # Task harus sudah dipublish
    if task.status != "published":
        raise HTTPException(
            status_code=400,
            detail="Task belum tersedia untuk dilamar",
        )

    # Validasi: deadline pendaftaran tidak boleh sudah lewat
    if task.application_deadline is not None:
        now_utc = datetime.now(timezone.utc)
        deadline = task.application_deadline
        # Normalisasi ke UTC jika belum timezone-aware
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if now_utc > deadline:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran untuk task ini sudah ditutup. "
                       "Batas akhir pendaftaran telah terlampaui.",
            )

    # Employer tidak boleh melamar task miliknya sendiri
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if employer_profile and task.employer_id == employer_profile.id:
        raise HTTPException(
            status_code=400,
            detail="Anda tidak dapat melamar task milik sendiri",
        )

    # 3. Cek apakah worker sudah pernah apply
    existing_application = session.exec(
        select(Application).where(
            Application.task_id == data.task_id,
            Application.worker_id == worker_profile.id,
        )
    ).first()

    if existing_application:
        raise HTTPException(
            status_code=400,
            detail="Anda sudah melamar task ini",
        )

    # 4. Buat application
    application = Application(
        task_id=data.task_id,
        worker_id=worker_profile.id,
        status="pending",
    )

    session.add(application)
    session.commit()
    session.refresh(application)

    return application


# ==========================================
# GET MY APPLICATIONS (WORKER)
# ==========================================

@router.get(
    "/my",
    response_model=list[ApplicationResponse],
)
def get_my_applications(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Cari Worker Profile
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if not worker_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Worker Profile",
        )

    applications = session.exec(
        select(Application).where(
            Application.worker_id == worker_profile.id
        )
    ).all()

    return applications


# ==========================================
# GET APPLICATIONS BY TASK (EMPLOYER)
# — Harus terdaftar SEBELUM /{application_id}
#   agar path literal "task" tidak tertangkap
#   oleh parameter UUID.
# ==========================================

@router.get(
    "/task/{task_id}",
    response_model=list[ApplicationWithWorkerResponse],
)
def get_applications_by_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Employer melihat semua lamaran untuk task miliknya.
    Mengembalikan data lamaran beserta informasi ringkas worker.
    """
    # Pastikan user punya Employer Profile
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not employer_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Employer Profile",
        )

    # Pastikan task ada
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

    # Pastikan task milik employer yang login
    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke task ini",
        )

    # Ambil semua lamaran untuk task ini
    applications = session.exec(
        select(Application).where(
            Application.task_id == task_id
        )
    ).all()

    result = []
    for app in applications:
        # Ambil WorkerProfile
        worker_profile = session.get(WorkerProfile, app.worker_id)

        if not worker_profile:
            continue

        # Ambil data User dari worker_profile.user_id
        worker_user = session.get(User, worker_profile.user_id)

        if not worker_user:
            continue

        worker_summary = WorkerSummary(
            worker_profile_id=worker_profile.id,
            user_id=worker_user.id,
            full_name=worker_user.full_name,
            email=worker_user.email,
            bio=worker_profile.bio,
            skills=worker_profile.skills,
            accepted_payment_methods=worker_profile.accepted_payment_methods,
            rating_avg=worker_profile.rating_avg,
        )

        result.append(
            ApplicationWithWorkerResponse(
                id=app.id,
                task_id=app.task_id,
                worker_id=app.worker_id,
                status=app.status,
                applied_at=app.applied_at,
                worker=worker_summary,
            )
        )

    # Urutkan: pending di atas, lalu berdasarkan waktu apply
    result.sort(
        key=lambda a: (
            0 if a.status == "pending" else 1,
            a.applied_at,
        )
    )

    return result


# ==========================================
# GET APPLICATION DETAIL
# ==========================================

@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
)
def get_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    application = session.get(
        Application,
        application_id,
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan",
        )

    # Cari Worker Profile
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    # Cari Employer Profile
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    # User harus merupakan worker pemilik
    # atau employer pemilik task
    is_worker_owner = (
        worker_profile
        and application.worker_id == worker_profile.id
    )

    task = session.get(
        Task,
        application.task_id,
    )

    is_employer_owner = (
        employer_profile
        and task
        and task.employer_id == employer_profile.id
    )

    if not is_worker_owner and not is_employer_owner:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke application ini",
        )

    return application


# ==========================================
# UPDATE APPLICATION STATUS (EMPLOYER)
# ==========================================

@router.put(
    "/{application_id}/status",
    response_model=ApplicationResponse,
)
def update_application_status(
    application_id: UUID,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    application = session.get(
        Application,
        application_id,
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan",
        )

    # Cari Employer Profile
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not employer_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Employer Profile",
        )

    # Cari task
    task = session.get(
        Task,
        application.task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

    # Pastikan task milik employer yang login
    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke application ini",
        )

    # Status yang diperbolehkan
    allowed_statuses = {
        "accepted",
        "rejected",
    }

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status harus accepted atau rejected",
        )

    # Application yang sudah diproses tidak boleh diproses lagi
    if application.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Application sudah diproses",
        )

    # Jika employer menerima worker,
    # pastikan jumlah worker tidak melebihi kebutuhan task
    if data.status == "accepted":
        accepted_applications = session.exec(
            select(Application).where(
                Application.task_id == task.id,
                Application.status == "accepted",
            )
        ).all()

        if len(accepted_applications) >= task.worker_needed:
            raise HTTPException(
                status_code=400,
                detail="Jumlah worker yang dibutuhkan sudah terpenuhi",
            )

    application.status = data.status

    session.add(application)
    session.commit()
    session.refresh(application)

    return application


# ==========================================
# DELETE / CANCEL APPLICATION (WORKER)
# ==========================================

@router.delete(
    "/{application_id}",
)
def delete_application(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    application = session.get(
        Application,
        application_id,
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan",
        )

    # Cari Worker Profile
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if not worker_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Worker Profile",
        )

    # Pastikan application milik worker yang login
    if application.worker_id != worker_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke application ini",
        )

    # Worker hanya boleh membatalkan
    # application yang masih pending
    if application.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Application yang sudah diproses tidak dapat dibatalkan",
        )

    session.delete(application)
    session.commit()

    return {
        "message": "Application berhasil dibatalkan"
    }
