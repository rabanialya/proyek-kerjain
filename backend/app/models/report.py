from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Report(SQLModel, table=True):
    __tablename__ = "reports"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    reported_by: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    # Target laporan: pengguna atau task (salah satu atau kosong)
    reported_user_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        index=True
    )

    reported_task_id: UUID | None = Field(
        default=None,
        foreign_key="tasks.id",
        index=True
    )

    # Kategori/alasan laporan (pilihan enum string)
    # fraud | wrong_info | inappropriate | spam | rule_violation | other
    reason_category: str | None = Field(default=None)

    subject: str
    description: str

    # Status: open | pending | under_review | resolved | rejected
    status: str = Field(default="open")

    # Catatan Admin saat menangani laporan
    admin_notes: str | None = Field(default=None)

    resolution: str | None = None

    resolved_by: UUID | None = Field(
        default=None,
        foreign_key="users.id"
    )

    resolved_at: datetime | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
