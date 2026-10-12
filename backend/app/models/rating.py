from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, UniqueConstraint

class Rating(SQLModel, table=True):
    __tablename__ = "ratings"

    __table_args__ = (
        UniqueConstraint(
            "assignment_id",
            "from_user_id",
            name="uq_rating_assignment_from_user"
        ),
    )

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    assignment_id: UUID = Field(
        foreign_key="assignments.id",
        index=True
    )

    from_user_id: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    to_user_id: UUID = Field(
        foreign_key="users.id",
        index=True
    )

    score: int = Field(
        ge=1,
        le=5
    )

    review: str | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )