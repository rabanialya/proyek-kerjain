from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    is_read: bool
    created_at: datetime