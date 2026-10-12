from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    task_id: UUID = Field(
        foreign_key="tasks.id",
        index=True
    )

    worker_id: UUID = Field(
        foreign_key="worker_profiles.id",
        index=True
    )

    status: str = Field(default="pending")

    applied_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )