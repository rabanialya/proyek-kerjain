from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    application_id: UUID


class AssignmentStatusUpdate(BaseModel):
    status: str


class AssignmentResponse(BaseModel):
    id: UUID
    application_id: UUID
    status: str

    started_at: datetime | None = None
    completed_at: datetime | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None

    created_at: datetime
    updated_at: datetime