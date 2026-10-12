from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "",
    response_model=list[NotificationResponse]
)
def get_my_notifications(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    ).all()

    return notifications


@router.get(
    "/unread",
    response_model=list[NotificationResponse]
)
def get_unread_notifications(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    notifications = session.exec(
        select(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .order_by(Notification.created_at.desc())
    ).all()

    return notifications


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse
)
def get_notification(
    notification_id: UUID,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    notification = session.get(Notification, notification_id)

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notifikasi tidak ditemukan"
        )

    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke notifikasi ini"
        )

    return notification


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_notification_as_read(
    notification_id: UUID,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    notification = session.get(Notification, notification_id)

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notifikasi tidak ditemukan"
        )

    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke notifikasi ini"
        )

    notification.is_read = True

    session.add(notification)
    session.commit()
    session.refresh(notification)

    return notification