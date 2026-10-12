from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    email: str = Field(
        unique=True,
        index=True
    )

    password_hash: str

    full_name: str

    phone: str | None = None

    avatar_url: str | None = None

    is_admin: bool = Field(default=False)

    is_active: bool = Field(default=True)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )