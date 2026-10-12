from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.category import Category
from app.models.employer_profile import EmployerProfile
from app.models.task import Task
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


# =========================================================
# GET PUBLIC TASKS
# =========================================================

@router.get("", response_model=list[TaskResponse])
def get_tasks(
    session: Session = Depends(get_session),
):
    statement = select(Task).where(
        Task.status == "published"
    )

    tasks = session.exec(statement).all()

    return tasks


# =========================================================
# GET TASK DETAIL
# =========================================================

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

    # Public hanya dapat melihat task yang published
    if task.status != "published":
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

    return task


# =========================================================
# CREATE TASK
# =========================================================

@router.post(
    "",
    response_model=TaskResponse,
    status_code=201,
)
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

    category = session.get(
        Category,
        data.category_id
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    if not category.is_active:
        raise HTTPException(
            status_code=400,
            detail="Category sedang tidak aktif",
        )

    task = Task(
        employer_id=employer_profile.id,
        category_id=data.category_id,
        title=data.title,
        description=data.description,
        location=data.location,
        worker_needed=data.worker_needed,
        wage_amount=data.wage_amount,
        payment_method=data.payment_method,
        status="draft",
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =========================================================
# UPDATE TASK
# =========================================================

@router.put(
    "/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(
        Task,
        task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

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

    # Task yang sudah closed tidak dapat diedit
    if task.status == "closed":
        raise HTTPException(
            status_code=400,
            detail="Task yang sudah ditutup tidak dapat diedit",
        )

    if data.category_id is not None:
        category = session.get(
            Category,
            data.category_id,
        )

        if not category:
            raise HTTPException(
                status_code=404,
                detail="Category tidak ditemukan",
            )

        if not category.is_active:
            raise HTTPException(
                status_code=400,
                detail="Category sedang tidak aktif",
            )

        task.category_id = data.category_id

    if data.title is not None:
        task.title = data.title

    if data.description is not None:
        task.description = data.description

    if data.location is not None:
        task.location = data.location

    if data.worker_needed is not None:
        task.worker_needed = data.worker_needed

    if data.wage_amount is not None:
        task.wage_amount = data.wage_amount

    if data.payment_method is not None:
        task.payment_method = data.payment_method

    task.updated_at = datetime.now(timezone.utc)

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =========================================================
# PUBLISH TASK
# =========================================================

@router.post(
    "/{task_id}/publish",
    response_model=TaskResponse,
)
def publish_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(
        Task,
        task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

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

@router.post(
    "/{task_id}/close",
    response_model=TaskResponse,
)
def close_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    task = session.get(
        Task,
        task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

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
    task = session.get(
        Task,
        task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan",
        )

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

    return {
        "message": "Task berhasil dihapus"
    }