from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class WorkEvidence(SQLModel, table=True):
    __tablename__ = "work_evidences"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    assignment_id: UUID = Field(
        foreign_key="assignments.id",
        index=True
    )

    file_url: str

    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )