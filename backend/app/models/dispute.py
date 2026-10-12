from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Dispute(SQLModel, table=True):
    __tablename__ = "disputes"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    assignment_id: UUID = Field(
        foreign_key="assignments.id",
        index=True
    )

    raised_by: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    reason: str
    description: str | None = None

    status: str = Field(default="open")

    resolution: str | None = None

    resolved_by: UUID | None = Field(
        default=None,
        foreign_key="users.id"
    )

    resolved_at: datetime | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )