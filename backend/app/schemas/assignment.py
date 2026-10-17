from datetime import datetime
from decimal import Decimal
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


class WorkerJobResponse(BaseModel):
    """
    Assignment milik Worker yang sedang login, diperkaya dengan
    detail task, employer, dan kategori — untuk halaman Pekerjaan Saya.
    """

    # ── Assignment ─────────────────────────────────────────────────────
    assignment_id: UUID
    assignment_status: str
    assignment_created_at: datetime
    started_at: datetime | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None

    # ── Application ────────────────────────────────────────────────────
    application_id: UUID
    applied_at: datetime

    # ── Task ───────────────────────────────────────────────────────────
    task_id: UUID
    task_title: str
    task_description: str | None = None
    task_location: str
    task_status: str
    wage_amount: Decimal
    payment_method: str

    # ── Kategori ───────────────────────────────────────────────────────
    category_id: UUID
    category_name: str | None = None

    # ── Employer (hanya info yang boleh dilihat Worker) ─────────────────
    employer_display_name: str