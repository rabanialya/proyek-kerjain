from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    employer_id: UUID = Field(
        foreign_key="employer_profiles.id",
        index=True
    )

    category_id: UUID = Field(
        foreign_key="categories.id",
        index=True
    )

    title: str
    description: str | None = None
    location: str
    worker_needed: int = Field(default=1)
    wage_amount: Decimal
    payment_method: str
    status: str = Field(default="draft")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    published_at: datetime | None = None

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )