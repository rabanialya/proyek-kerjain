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


class WorkerSummary(BaseModel):
    """Informasi ringkas worker yang ditampilkan dalam daftar lamaran."""
    worker_profile_id: UUID
    user_id: UUID
    full_name: str
    email: str
    bio: str | None = None
    skills: str | None = None
    accepted_payment_methods: str | None = None
    rating_avg: float


class ApplicationWithWorkerResponse(BaseModel):
    """
    Application dengan informasi worker yang terembed.
    Digunakan oleh Employer untuk melihat daftar pelamar suatu task.
    """
    id: UUID
    task_id: UUID
    worker_id: UUID
    status: str
    applied_at: datetime
    worker: WorkerSummary