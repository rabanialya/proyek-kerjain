from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.application import Application
from app.models.assignment import Assignment
from app.models.employer_profile import EmployerProfile
from app.models.task import Task
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.models.category import Category
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStatusUpdate,
    WorkerJobResponse,
    EmployerJobResponse,
)

from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
)


# =========================================================
# CREATE ASSIGNMENT
# =========================================================

@router.post(
    "",
    response_model=AssignmentResponse,
    status_code=201
)
def create_assignment(
    data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Pastikan user memiliki Employer Profile
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not employer_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Employer Profile"
        )

    # Cari application
    application = session.get(
        Application,
        data.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    # Application harus accepted
    if application.status != "accepted":
        raise HTTPException(
            status_code=400,
            detail="Assignment hanya dapat dibuat dari application yang accepted"
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

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke application ini"
        )

    # Cegah assignment duplikat
    existing_assignment = session.exec(
        select(Assignment).where(
            Assignment.application_id == data.application_id
        )
    ).first()

    if existing_assignment:
        raise HTTPException(
            status_code=400,
            detail="Assignment untuk application ini sudah dibuat"
        )

    assignment = Assignment(
        application_id=data.application_id,
        status="assigned",
    )

    # Hitung deadline aktual dari work_deadline_days task.
    # Disalin ke assignment saat dibuat — tidak berubah jika task diubah kemudian.
    if task.work_deadline_days is not None:
        now_utc = datetime.now(timezone.utc)
        assignment.deadline_at = now_utc + timedelta(days=task.work_deadline_days)
    else:
        assignment.deadline_at = None

    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    return assignment


# =========================================================
# GET MY ASSIGNMENTS
# =========================================================

@router.get(
    "/my",
    response_model=list[AssignmentResponse]
)
def get_my_assignments(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
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

    assignments = []

    # Assignment sebagai Worker
    if worker_profile:
        worker_applications = session.exec(
            select(Application).where(
                Application.worker_id == worker_profile.id
            )
        ).all()

        worker_application_ids = [
            application.id
            for application in worker_applications
        ]

        if worker_application_ids:
            assignments.extend(
                session.exec(
                    select(Assignment).where(
                        Assignment.application_id.in_(
                            worker_application_ids
                        )
                    )
                ).all()
            )

    # Assignment sebagai Employer
    if employer_profile:
        employer_tasks = session.exec(
            select(Task).where(
                Task.employer_id == employer_profile.id
            )
        ).all()

        employer_task_ids = [
            task.id
            for task in employer_tasks
        ]

        if employer_task_ids:
            employer_applications = session.exec(
                select(Application).where(
                    Application.task_id.in_(
                        employer_task_ids
                    )
                )
            ).all()

            employer_application_ids = [
                application.id
                for application in employer_applications
            ]

            if employer_application_ids:
                assignments.extend(
                    session.exec(
                        select(Assignment).where(
                            Assignment.application_id.in_(
                                employer_application_ids
                            )
                        )
                    ).all()
                )

    unique_assignments = {
        assignment.id: assignment
        for assignment in assignments
    }

    return list(unique_assignments.values())


# =========================================================
# GET WORKER MY-JOBS  (enriched, worker-only)
# =========================================================

@router.get(
    "/worker/my-jobs",
    response_model=list[WorkerJobResponse],
    summary="Pekerjaan Saya (Worker) — dengan detail task & employer",
)
def get_worker_my_jobs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Mengembalikan semua assignment yang dimiliki worker yang sedang login,
    diperkaya dengan informasi task, kategori, dan employer.

    Hanya assignment yang terhubung dengan application berstatus *accepted*
    yang dapat muncul di sini — karena assignment hanya dibuat dari
    application accepted (dijaga oleh POST /assignments).

    Otorisasi: worker hanya dapat melihat assignment miliknya sendiri
    (difilter berdasarkan worker_profile.user_id == current_user.id).
    """
    # 1. Pastikan user punya Worker Profile
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

    # 2. Ambil semua application milik worker ini
    worker_applications = session.exec(
        select(Application).where(
            Application.worker_id == worker_profile.id,
            Application.status == "accepted",
        )
    ).all()

    if not worker_applications:
        return []

    worker_app_map = {app.id: app for app in worker_applications}

    # 3. Ambil semua assignment yang terhubung ke application tersebut
    assignments = session.exec(
        select(Assignment).where(
            Assignment.application_id.in_(list(worker_app_map.keys()))
        )
    ).all()

    if not assignments:
        return []

    # 4. Enrich setiap assignment dengan task, kategori, dan employer
    result: list[WorkerJobResponse] = []

    for assignment in assignments:
        application = worker_app_map.get(assignment.application_id)

        if not application:
            continue

        task = session.get(Task, application.task_id)

        if not task:
            continue

        # Kategori
        category = session.get(Category, task.category_id)

        # Employer (hanya display_name — tidak bocorkan data pribadi)
        employer_profile = session.get(EmployerProfile, task.employer_id)
        employer_display = (
            employer_profile.display_name
            if employer_profile
            else "Employer tidak ditemukan"
        )

        result.append(
            WorkerJobResponse(
                assignment_id=assignment.id,
                assignment_status=assignment.status,
                assignment_created_at=assignment.created_at,
                started_at=assignment.started_at,
                submitted_at=assignment.submitted_at,
                approved_at=assignment.approved_at,
                completed_at=assignment.completed_at,
                deadline_at=assignment.deadline_at,
                application_id=application.id,
                applied_at=application.applied_at,
                task_id=task.id,
                task_title=task.title,
                task_description=task.description,
                task_location=task.location,
                task_status=task.status,
                wage_amount=task.wage_amount,
                wage_rate=task.wage_rate,
                payment_method=task.payment_method,
                work_type=task.work_type,
                work_date=task.work_date,
                work_time_start=(
                    task.work_time_start.strftime("%H:%M")
                    if task.work_time_start else None
                ),
                work_time_end=(
                    task.work_time_end.strftime("%H:%M")
                    if task.work_time_end else None
                ),
                work_deadline_days=task.work_deadline_days,
                category_id=task.category_id,
                category_name=category.name if category else None,
                employer_display_name=employer_display,
            )
        )

    # Urutkan: yang paling baru dibuat terlebih dahulu
    result.sort(key=lambda r: r.assignment_created_at, reverse=True)

    return result


# =========================================================
# GET EMPLOYER MY-JOBS  (enriched, employer-only)
# =========================================================

@router.get(
    "/employer/my-jobs",
    response_model=list[EmployerJobResponse],
    summary="Pekerjaan Aktif (Employer) — dengan detail task & worker",
)
def get_employer_my_jobs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Mengembalikan semua assignment pada task milik employer yang sedang login,
    diperkaya dengan informasi task, kategori, dan worker.

    Otorisasi: employer hanya dapat melihat assignment dari task miliknya sendiri
    (difilter berdasarkan employer_profile.user_id == current_user.id).
    """
    # 1. Pastikan user punya Employer Profile
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

    # 2. Ambil semua task milik employer ini
    employer_tasks = session.exec(
        select(Task).where(
            Task.employer_id == employer_profile.id
        )
    ).all()

    if not employer_tasks:
        return []

    task_map = {t.id: t for t in employer_tasks}

    # 3. Ambil semua application yang task_id-nya milik employer ini
    employer_applications = session.exec(
        select(Application).where(
            Application.task_id.in_(list(task_map.keys()))
        )
    ).all()

    if not employer_applications:
        return []

    app_map = {app.id: app for app in employer_applications}

    # 4. Ambil semua assignment yang terhubung ke application tersebut
    assignments = session.exec(
        select(Assignment).where(
            Assignment.application_id.in_(list(app_map.keys()))
        )
    ).all()

    if not assignments:
        return []

    # 5. Enrich setiap assignment dengan task, kategori, dan worker
    result: list[EmployerJobResponse] = []

    for assignment in assignments:
        application = app_map.get(assignment.application_id)
        if not application:
            continue

        task = task_map.get(application.task_id)
        if not task:
            continue

        # Kategori
        category = session.get(Category, task.category_id)

        # Worker Profile
        worker_profile = session.exec(
            select(WorkerProfile).where(
                WorkerProfile.id == application.worker_id
            )
        ).first()

        # User data Worker (untuk nama & kontak)
        worker_user: User | None = None
        worker_display = "Worker tidak ditemukan"
        worker_email: str | None = None
        worker_phone: str | None = None
        worker_rating: float = 0.0

        if worker_profile:
            worker_user = session.get(User, worker_profile.user_id)
            worker_display = (
                worker_profile.nickname
                or (worker_user.full_name if worker_user else "Worker")
            )
            worker_email = worker_user.email if worker_user else None
            worker_phone = worker_user.phone if worker_user else None
            worker_rating = worker_profile.rating_avg

        result.append(
            EmployerJobResponse(
                assignment_id=assignment.id,
                assignment_status=assignment.status,
                assignment_created_at=assignment.created_at,
                started_at=assignment.started_at,
                submitted_at=assignment.submitted_at,
                approved_at=assignment.approved_at,
                completed_at=assignment.completed_at,
                deadline_at=assignment.deadline_at,
                application_id=application.id,
                applied_at=application.applied_at,
                task_id=task.id,
                task_title=task.title,
                task_description=task.description,
                task_location=task.location,
                task_status=task.status,
                wage_amount=task.wage_amount,
                wage_rate=task.wage_rate,
                payment_method=task.payment_method,
                work_type=task.work_type,
                work_date=task.work_date,
                work_time_start=(
                    task.work_time_start.strftime("%H:%M")
                    if task.work_time_start else None
                ),
                work_time_end=(
                    task.work_time_end.strftime("%H:%M")
                    if task.work_time_end else None
                ),
                work_deadline_days=task.work_deadline_days,
                category_id=task.category_id,
                category_name=category.name if category else None,
                worker_display_name=worker_display,
                worker_email=worker_email,
                worker_phone=worker_phone,
                worker_rating_avg=worker_rating,
            )
        )

    # Urutkan: submitted dulu, lalu in_progress, lalu yang lain; dalam grup: terbaru duluan
    STATUS_ORDER = {"submitted": 0, "in_progress": 1, "assigned": 2, "approved": 3, "disputed": 4}
    result.sort(
        key=lambda r: (
            STATUS_ORDER.get(r.assignment_status, 99),
            -(r.assignment_created_at.timestamp()),
        )
    )

    return result


# =========================================================
# GET ASSIGNMENT DETAIL
# =========================================================

@router.get(
    "/{assignment_id}",
    response_model=AssignmentResponse
)
def get_assignment(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    assignment = session.get(
        Assignment,
        assignment_id
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

    # Cek Worker
    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if worker_profile and application.worker_id == worker_profile.id:
        return assignment

    # Cek Employer
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if employer_profile:
        task = session.get(
            Task,
            application.task_id
        )

        if task and task.employer_id == employer_profile.id:
            return assignment

    raise HTTPException(
        status_code=403,
        detail="Anda tidak memiliki akses ke assignment ini"
    )


# =========================================================
# UPDATE ASSIGNMENT STATUS
# =========================================================

@router.put(
    "/{assignment_id}/status",
    response_model=AssignmentResponse
)
def update_assignment_status(
    assignment_id: UUID,
    data: AssignmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    assignment = session.get(
        Assignment,
        assignment_id
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

    is_worker = (
        worker_profile is not None
        and application.worker_id == worker_profile.id
    )

    is_employer = (
        employer_profile is not None
        and task.employer_id == employer_profile.id
    )

    if not is_worker and not is_employer:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke assignment ini"
        )

    # -----------------------------------------------------
    # WORKER
    # -----------------------------------------------------

    if is_worker:

        if data.status == "in_progress":

            if assignment.status != "assigned":
                raise HTTPException(
                    status_code=400,
                    detail="Assignment tidak dapat dimulai dari status saat ini"
                )

            assignment.status = "in_progress"
            assignment.started_at = datetime.now(timezone.utc)

        elif data.status == "submitted":

            if assignment.status != "in_progress":
                raise HTTPException(
                    status_code=400,
                    detail="Assignment harus berstatus in_progress sebelum disubmit"
                )

            assignment.status = "submitted"
            assignment.submitted_at = datetime.now(timezone.utc)

        else:

            raise HTTPException(
                status_code=400,
                detail="Worker hanya dapat mengubah status menjadi in_progress atau submitted"
            )

    # -----------------------------------------------------
    # EMPLOYER
    # -----------------------------------------------------

    elif is_employer:

        if data.status == "approved":

            if assignment.status != "submitted":
                raise HTTPException(
                    status_code=400,
                    detail="Assignment harus berstatus submitted sebelum disetujui"
                )

            assignment.status = "approved"
            assignment.approved_at = datetime.now(timezone.utc)
            assignment.completed_at = datetime.now(timezone.utc)

        elif data.status == "disputed":

            if assignment.status != "submitted":
                raise HTTPException(
                    status_code=400,
                    detail="Assignment harus berstatus submitted sebelum diajukan dispute"
                )

            assignment.status = "disputed"

        else:

            raise HTTPException(
                status_code=400,
                detail="Employer hanya dapat mengubah status menjadi approved atau disputed"
            )

    assignment.updated_at = datetime.now(timezone.utc)

    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    return assignment