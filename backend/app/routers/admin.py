from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timezone

from app.models.user import User
from app.utils.dependencies import get_current_admin, get_session
from app.schemas.admin import UserStatusUpdate
from app.models.report import Report
from app.schemas.report import ReportResponse, ReportResolve
from app.models.dispute import Dispute
from app.schemas.dispute import DisputeResponse, DisputeResolve
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse
from app.models.category import Category
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate
from app.models.task import Task
from app.schemas.task import TaskResponse


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/users")
def get_all_users(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    users = session.exec(
        select(User).order_by(User.created_at.desc())
    ).all()

    return users


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    return user

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: UUID,
    data: UserStatusUpdate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Admin tidak dapat menonaktifkan akun sendiri"
        )

    user.is_active = data.is_active

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "message": "Status user berhasil diperbarui",
        "user_id": user.id,
        "is_active": user.is_active
    }

@router.get(
    "/reports",
    response_model=list[ReportResponse]
)
def get_all_reports(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    reports = session.exec(
        select(Report)
        .order_by(Report.created_at.desc())
    ).all()

    return reports

@router.get(
    "/reports/{report_id}",
    response_model=ReportResponse
)
def get_report_detail(
    report_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    report = session.get(Report, report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report tidak ditemukan"
        )

    return report

@router.put(
    "/reports/{report_id}/resolve",
    response_model=ReportResponse
)
def resolve_report(
    report_id: UUID,
    data: ReportResolve,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    report = session.get(Report, report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report tidak ditemukan"
        )

    if report.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Report sudah diselesaikan"
        )

    report.status = "resolved"
    report.resolution = data.resolution
    report.resolved_by = current_admin.id
    report.resolved_at = datetime.now(timezone.utc)

    session.add(report)
    session.commit()
    session.refresh(report)

    return report

@router.get(
    "/disputes",
    response_model=list[DisputeResponse]
)
def get_all_disputes(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    disputes = session.exec(
        select(Dispute)
        .order_by(Dispute.created_at.desc())
    ).all()

    return disputes

@router.get(
    "/disputes/{dispute_id}",
    response_model=DisputeResponse
)
def get_dispute_detail(
    dispute_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    dispute = session.get(Dispute, dispute_id)

    if not dispute:
        raise HTTPException(
            status_code=404,
            detail="Dispute tidak ditemukan"
        )

    return dispute

@router.put(
    "/disputes/{dispute_id}/resolve",
    response_model=DisputeResponse
)
def resolve_dispute(
    dispute_id: UUID,
    data: DisputeResolve,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    dispute = session.get(Dispute, dispute_id)

    if not dispute:
        raise HTTPException(
            status_code=404,
            detail="Dispute tidak ditemukan"
        )

    if dispute.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Dispute sudah diselesaikan"
        )

    dispute.status = "resolved"
    dispute.resolution = data.resolution
    dispute.resolved_by = current_admin.id
    dispute.resolved_at = datetime.now(timezone.utc)

    session.add(dispute)
    session.commit()
    session.refresh(dispute)

    return dispute

@router.get(
    "/activity-logs",
    response_model=list[ActivityLogResponse]
)
def get_all_activity_logs(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    logs = session.exec(
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
    ).all()

    return logs

@router.get(
    "/activity-logs/{log_id}",
    response_model=ActivityLogResponse
)
def get_activity_log_detail(
    log_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    log = session.get(ActivityLog, log_id)

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Activity log tidak ditemukan"
        )

    return log

@router.get(
    "/categories",
    response_model=list[CategoryResponse]
)
def get_all_categories(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    categories = session.exec(
        select(Category)
    ).all()

    return categories

@router.get(
    "/categories/{category_id}",
    response_model=CategoryResponse
)
def get_category_detail_admin(
    category_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan"
        )

    return category

@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=201,
)
def create_category_admin(
    data: CategoryCreate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    existing_category = session.exec(
        select(Category).where(
            Category.name == data.name
        )
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category sudah ada",
        )

    category = Category(
        name=data.name
    )

    session.add(category)
    session.commit()
    session.refresh(category)

    return category

@router.put(
    "/categories/{category_id}",
    response_model=CategoryResponse,
)
def update_category_admin(
    category_id: UUID,
    data: CategoryUpdate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    if data.name is not None:
        existing_category = session.exec(
            select(Category).where(
                Category.name == data.name,
                Category.id != category_id,
            )
        ).first()

        if existing_category:
            raise HTTPException(
                status_code=400,
                detail="Category sudah ada",
            )

        category.name = data.name

    if data.is_active is not None:
        category.is_active = data.is_active

    session.add(category)
    session.commit()
    session.refresh(category)

    return category

@router.delete(
    "/categories/{category_id}"
)
def delete_category_admin(
    category_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    session.delete(category)
    session.commit()

    return {
        "message": "Category berhasil dihapus"
    }

@router.get(
    "/tasks",
    response_model=list[TaskResponse]
)
def get_all_tasks_admin(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    tasks = session.exec(
        select(Task)
        .order_by(Task.created_at.desc())
    ).all()

    return tasks

@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse
)
def get_task_detail_admin(
    task_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    return task