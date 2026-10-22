from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Assignment(SQLModel, table=True):
    __tablename__ = "assignments"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    application_id: UUID = Field(
        foreign_key="applications.id",
        unique=True,
        index=True,
    )

    status: str = Field(default="assigned")

    # Timestamp progres assignment
    started_at: datetime | None = None
    completed_at: datetime | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None

    # Deadline aktual pengerjaan — dihitung saat assignment dibuat
    # dari task.work_deadline_days (created_at + N hari kalender).
    # NULL jika task tidak punya work_deadline_days (kerja terjadwal / data lama).
    # Setelah dibuat, nilai ini tidak berubah mengikuti perubahan task.
    deadline_at: datetime | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
