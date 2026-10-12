from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Report(SQLModel, table=True):
    __tablename__ = "reports"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    reported_by: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    reported_user_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        index=True
    )

    subject: str
    description: str

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