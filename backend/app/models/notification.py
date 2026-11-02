from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    user_id: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    title: str
    message: str

    entity_type: str | None = None
    entity_id: UUID | None = None

    # Peran penerima notifikasi: "worker", "employer", atau "admin".
    # Nullable untuk kompatibilitas dengan data notifikasi lama (sebelum
    # penambahan kolom ini). Notifikasi baru wajib mengisi target_role.
    target_role: str | None = None

    is_read: bool = Field(default=False)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )