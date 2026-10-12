from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    category_id: UUID

    title: str = Field(min_length=3)
    description: str | None = None
    location: str

    worker_needed: int = Field(default=1, ge=1)
    wage_amount: Decimal = Field(gt=0)

    payment_method: str


class TaskUpdate(BaseModel):
    category_id: UUID | None = None

    title: str | None = Field(
        default=None,
        min_length=3
    )

    description: str | None = None
    location: str | None = None

    worker_needed: int | None = Field(
        default=None,
        ge=1
    )

    wage_amount: Decimal | None = Field(
        default=None,
        gt=0
    )

    payment_method: str | None = None


class TaskResponse(BaseModel):
    id: UUID
    employer_id: UUID
    category_id: UUID

    title: str
    description: str | None = None
    location: str

    worker_needed: int
    wage_amount: Decimal

    payment_method: str
    status: str

    created_at: datetime
    published_at: datetime | None = None
    updated_at: datetime