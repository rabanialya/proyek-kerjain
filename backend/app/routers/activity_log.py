from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/activity-logs",
    tags=["Activity Logs"]
)


@router.get(
    "",
    response_model=list[ActivityLogResponse]
)
def get_my_activity_logs(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    logs = session.exec(
        select(ActivityLog)
        .where(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
    ).all()

    return logs


@router.get(
    "/{log_id}",
    response_model=ActivityLogResponse
)
def get_activity_log(
    log_id: UUID,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    log = session.get(ActivityLog, log_id)

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Activity log tidak ditemukan"
        )

    if log.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke activity log ini"
        )

    return log