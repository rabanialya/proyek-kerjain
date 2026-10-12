from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_logs"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    user_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        index=True
    )

    entity_type: str
    entity_id: UUID

    action: str

    old_value: dict | None = Field(
        default=None,
        sa_column=Column(JSON)
    )

    new_value: dict | None = Field(
        default=None,
        sa_column=Column(JSON)
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )