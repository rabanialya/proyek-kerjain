from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    assignment_id: UUID | None = Field(
        default=None,
        foreign_key="assignments.id",
        index=True
    )

    task_id: UUID | None = Field(
        default=None,
        foreign_key="tasks.id",
        index=True
    )

    type: str
    method: str
    amount: Decimal
    status: str = Field(default="pending")

    transaction_reference: str | None = None

    paid_at: datetime | None = None

    confirmed_by: UUID | None = Field(
        default=None,
        foreign_key="users.id"
    )

    confirmed_at: datetime | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )