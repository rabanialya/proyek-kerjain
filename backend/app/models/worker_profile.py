from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class WorkerProfile(SQLModel, table=True):
    __tablename__ = "worker_profiles"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    user_id: UUID = Field(
        foreign_key="users.id",
        unique=True,
        index=True
    )

    bio: str | None = None

    skills: str | None = None

    accepted_payment_methods: str | None = None

    rating_avg: float = Field(
        default=0.0
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )