from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.category import Category
from app.models.employer_profile import EmployerProfile
from app.models.task import Task
from app.models.user import User
from app.schemas.task import (
    VALID_WAGE_RATES,
    VALID_WORK_TYPES,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


# ─── Helper validasi kondisional ──────────────────────────────────────────────

def _validate_task_for_publish(task: Task) -> None:
    """
    Aturan yang hanya diberlakukan saat publish (bukan saat simpan draft):
    1. work_type wajib diisi.
    2. on_site / hybrid → location wajib.
    3. wage_rate wajib diisi.
    4. application_deadline jika ada → harus di masa depan.
    5. work_time_end jika ada → harus setelah work_time_start.
    Melempar HTTPException 400 jika ada aturan yang dilanggar.
    """
    now_utc = datetime.now(timezone.utc)

    if not task.work_type:
        raise HTTPException(
            status_code=400,
            detail="Tipe kerja (work_type) wajib diisi sebelum task dapat dipublikasikan.",
        )

    if task.work_type in ("on_site", "hybrid") and not task.location:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Lokasi fisik wajib diisi untuk tipe kerja '{task.work_type}'. "
                "Isi kolom location sebelum mempublikasikan task."
            ),
        )

    if not task.wage_rate:
        raise HTTPException(
            status_code=400,
            detail="Satuan upah (wage_rate) wajib diisi sebelum task dapat dipublikasikan.",
        )

    if task.application_deadline is not None:
        # Normalisasi: pastikan keduanya timezone-aware sebelum dibandingkan
        deadline = task.application_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if deadline <= now_utc:
            raise HTTPException(
                status_code=400,
                detail="Batas akhir pendaftaran (application_deadline) sudah lewat. "
                       "Perbarui deadline sebelum mempublikasikan task.",
            )

    if task.work_time_end is not None and task.work_time_start is not None:
        if task.work_time_end <= task.work_time_start:
            raise HTTPException(
                status_code=400,
                detail="Jam selesai (work_time_end) harus lebih dari jam mulai (work_time_start).",
            )


def _validate_task_fields_for_draft(data: TaskCreate | TaskUpdate) -> None:
    """
    Validasi ringan yang berlaku bahkan saat simpan draft:
    - work_time_end harus setelah work_time_start jika keduanya diisi.
    - application_deadline harus di masa depan jika diisi.
    Enum work_type / wage_rate / requirements_flags sudah divalidasi di schema (field_validator).
    """
    now_utc = datetime.now(timezone.utc)

    if data.work_time_start is not None and data.work_time_end is not None:
        if data.work_time_end <= data.work_time_start:
            raise HTTPException(
                status_code=400,
                detail="Jam selesai (work_time_end) harus lebih dari jam mulai (work_time_start).",
            )

    if data.application_deadline is not None:
        deadline = data.application_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if deadline <= now_utc:
            raise HTTPException(
                status_code=400,
                detail="Batas akhir pendaftaran (application_deadline) harus di masa depan.",
            )


# =========================================================
# GET PUBLIC TASKS
# =========================================================

@router.get("", response_model=list[TaskResponse])
def get_tasks(
    session: Session = Depends(get_session),
):
    tasks = session.exec(
        select(Task).where(Task.status == "published")
    ).all()
    return tasks


# =========================================================
# GET MY TASKS (EMPLOYER)
# =========================================================

@router.get("/my", response_model=list[TaskResponse])
def get_my_tasks(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
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

    tasks = session.exec(
        select(Task)
        .where(Task.employer_id == employer_profile.id)
        .order_by(Task.created_at.desc())
    ).all()

    return tasks


# =========================================================
# GET TASK BY ID (PUBLIC — hanya published)
# =========================================================

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task or task.status != "published":
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    return task


# =========================================================
# GET TASK BY OWNER (semua status — draft, published, closed)
# =========================================================

@router.get("/{task_id}/owner", response_model=TaskResponse)
def get_task_as_owner(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

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

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke task ini",
        )

    return task


# =========================================================
# CREATE TASK
# =========================================================

@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
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

    category = session.get(Category, data.category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category tidak ditemukan")

    if not category.is_active:
        raise HTTPException(status_code=400, detail="Category sedang tidak aktif")

    # Validasi ringan yang berlaku bahkan untuk draft
    _validate_task_fields_for_draft(data)

    task = Task(
        employer_id=employer_profile.id,
        category_id=data.category_id,
        title=data.title,
        description=data.description,
        work_type=data.work_type,
        location=data.location,
        worker_needed=data.worker_needed,
        wage_amount=data.wage_amount,
        wage_rate=data.wage_rate,
        payment_method=data.payment_method,
        application_deadline=data.application_deadline,
        work_date=data.work_date,
        work_time_start=data.work_time_start,
        work_time_end=data.work_time_end,
        work_deadline_days=data.work_deadline_days,
        required_skills=data.required_skills,
        requirements_flags=data.requirements_flags,
        requirements_note=data.requirements_note,
        status="draft",
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =========================================================
# UPDATE TASK
# =========================================================

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

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

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke task ini",
        )

    if task.status == "closed":
        raise HTTPException(
            status_code=400,
            detail="Task yang sudah ditutup tidak dapat diedit",
        )

    # Validasi ringan (time range, deadline masa depan)
    _validate_task_fields_for_draft(data)

    # ── Partial update: hanya field yang dikirim ──────────────────────
    if data.category_id is not None:
        category = session.get(Category, data.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category tidak ditemukan")
        if not category.is_active:
            raise HTTPException(status_code=400, detail="Category sedang tidak aktif")
        task.category_id = data.category_id

    if data.title is not None:
        task.title = data.title

    if data.description is not None:
        task.description = data.description

    if data.work_type is not None:
        task.work_type = data.work_type

    if data.location is not None:
        task.location = data.location

    if data.worker_needed is not None:
        task.worker_needed = data.worker_needed

    if data.wage_amount is not None:
        task.wage_amount = data.wage_amount

    if data.wage_rate is not None:
        task.wage_rate = data.wage_rate

    if data.payment_method is not None:
        task.payment_method = data.payment_method

    if data.application_deadline is not None:
        task.application_deadline = data.application_deadline

    if data.work_date is not None:
        task.work_date = data.work_date

    if data.work_time_start is not None:
        task.work_time_start = data.work_time_start

    if data.work_time_end is not None:
        task.work_time_end = data.work_time_end

    if data.work_deadline_days is not None:
        task.work_deadline_days = data.work_deadline_days

    if data.required_skills is not None:
        task.required_skills = data.required_skills

    if data.requirements_flags is not None:
        task.requirements_flags = data.requirements_flags

    if data.requirements_note is not None:
        task.requirements_note = data.requirements_note

    task.updated_at = datetime.now(timezone.utc)

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =========================================================
# PUBLISH TASK
# =========================================================

@router.post("/{task_id}/publish", response_model=TaskResponse)
def publish_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

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

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke task ini",
        )

    if task.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Hanya task dengan status draft yang dapat dipublish",
        )

    # Validasi ketat sebelum publish
    _validate_task_for_publish(task)

    task.status = "published"
    task.published_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =========================================================
# CLOSE TASK
# =========================================================

@router.post("/{task_id}/close", response_model=TaskResponse)
def close_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

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

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke task ini",
        )

    if task.status != "published":
        raise HTTPException(
            status_code=400,
            detail="Hanya task yang published yang dapat ditutup",
        )

    task.status = "closed"
    task.updated_at = datetime.now(timezone.utc)

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =========================================================
# DELETE TASK
# =========================================================

@router.delete("/{task_id}")
def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

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

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke task ini",
        )

    session.delete(task)
    session.commit()

    return {"message": "Task berhasil dihapus"}
