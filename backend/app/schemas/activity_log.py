from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ActivityLogResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    entity_type: str
    entity_id: UUID
    action: str
    old_value: dict | None = None
    new_value: dict | None = None
    created_at: datetime