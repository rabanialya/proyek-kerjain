from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    assignment_id: UUID | None = None
    task_id: UUID | None = None

    type: str = Field(
        min_length=1
    )

    method: str = Field(
        min_length=1
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0
    )


class PaymentConfirm(BaseModel):
    pass

class PaymentSettlementCreate(BaseModel):
    method: str = Field(
        min_length=1
    )

class PaymentResponse(BaseModel):
    id: UUID

    assignment_id: UUID | None = None
    task_id: UUID | None = None

    type: str
    method: str
    amount: Decimal
    status: str

    transaction_reference: str | None = None

    paid_at: datetime | None = None

    confirmed_by: UUID | None = None
    confirmed_at: datetime | None = None

    created_at: datetime