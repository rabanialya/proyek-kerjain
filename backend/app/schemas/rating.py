from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    assignment_id: UUID

    to_user_id: UUID

    score: int = Field(
        ge=1,
        le=5
    )

    review: str | None = None


class RatingResponse(BaseModel):
    id: UUID

    assignment_id: UUID

    from_user_id: UUID

    to_user_id: UUID

    score: int

    review: str | None = None

    created_at: datetime