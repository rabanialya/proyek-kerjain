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

    # deadline_at: dihitung dari task.work_deadline_days saat assignment dibuat.
    # NULL jika task tidak punya work_deadline_days (kerja terjadwal / data lama).
    deadline_at: datetime | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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

    # deadline_at assignment (aktual, bukan dari task)
    deadline_at: datetime | None = None

    # ── Application ────────────────────────────────────────────────────
    application_id: UUID
    applied_at: datetime

    # ── Task ───────────────────────────────────────────────────────────
    task_id: UUID
    task_title: str
    task_description: str | None = None

    # location nullable: task lama tetap bisa ditampilkan
    task_location: str | None = None
    task_status: str

    wage_amount: Decimal
    wage_rate: str | None = None
    payment_method: str

    # Tipe kerja (nullable untuk kompatibilitas task lama)
    work_type: str | None = None

    # Jadwal task (nullable)
    work_date: datetime | None = None
    work_time_start: str | None = None   # dikirim sebagai string "HH:MM"
    work_time_end: str | None = None
    work_deadline_days: int | None = None

    # ── Kategori ───────────────────────────────────────────────────────
    category_id: UUID
    category_name: str | None = None

    # ── Employer (hanya info yang boleh dilihat Worker) ─────────────────
    employer_display_name: str

    class Config:
        from_attributes = True


class EmployerJobResponse(BaseModel):
    """
    Assignment milik Employer yang sedang login, diperkaya dengan
    detail task, worker, dan kategori — untuk halaman Pekerjaan Aktif Employer.
    """

    # ── Assignment ─────────────────────────────────────────────────────
    assignment_id: UUID
    assignment_status: str
    assignment_created_at: datetime
    started_at: datetime | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None
    deadline_at: datetime | None = None

    # ── Application ────────────────────────────────────────────────────
    application_id: UUID
    applied_at: datetime

    # ── Task ───────────────────────────────────────────────────────────
    task_id: UUID
    task_title: str
    task_description: str | None = None
    task_location: str | None = None
    task_status: str

    wage_amount: Decimal
    wage_rate: str | None = None
    payment_method: str

    work_type: str | None = None
    work_date: datetime | None = None
    work_time_start: str | None = None
    work_time_end: str | None = None
    work_deadline_days: int | None = None

    # ── Kategori ───────────────────────────────────────────────────────
    category_id: UUID
    category_name: str | None = None

    # ── Worker (info yang boleh dilihat Employer) ───────────────────────
    worker_display_name: str
    worker_email: str | None = None
    worker_phone: str | None = None
    worker_rating_avg: float = 0.0

    class Config:
        from_attributes = True
