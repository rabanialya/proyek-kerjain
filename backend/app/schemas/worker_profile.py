from uuid import UUID

from pydantic import BaseModel, Field


class WorkerProfileUpdate(BaseModel):
    bio: str | None = None
    skills: str | None = None
    accepted_payment_methods: str | None = None


class WorkerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    bio: str | None = None
    skills: str | None = None
    accepted_payment_methods: str | None = None
    rating_avg: float