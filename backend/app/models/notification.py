from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    user_id: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    title: str
    message: str

    entity_type: str | None = None
    entity_id: UUID | None = None

    is_read: bool = Field(default=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )