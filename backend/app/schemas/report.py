from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    reported_user_id: UUID | None = None

    subject: str = Field(
        min_length=3
    )

    description: str = Field(
        min_length=3
    )


class ReportResolve(BaseModel):
    resolution: str = Field(
        min_length=3
    )


class ReportResponse(BaseModel):
    id: UUID

    reported_by: UUID

    reported_user_id: UUID | None = None

    subject: str

    description: str

    status: str

    resolution: str | None = None

    resolved_by: UUID | None = None

    resolved_at: datetime | None = None

    created_at: datetime