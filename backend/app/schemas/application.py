from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ApplicationCreate(BaseModel):
    task_id: UUID


class ApplicationStatusUpdate(BaseModel):
    status: str


class ApplicationResponse(BaseModel):
    id: UUID
    task_id: UUID
    worker_id: UUID
    status: str
    applied_at: datetime