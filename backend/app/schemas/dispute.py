from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DisputeCreate(BaseModel):
    assignment_id: UUID

    reason: str = Field(
        min_length=3
    )

    description: str | None = None


class DisputeResolve(BaseModel):
    resolution: str = Field(
        min_length=3
    )


class DisputeResponse(BaseModel):
    id: UUID

    assignment_id: UUID

    raised_by: UUID

    reason: str

    description: str | None = None

    status: str

    resolution: str | None = None

    resolved_by: UUID | None = None

    resolved_at: datetime | None = None

    created_at: datetime