from uuid import UUID

from pydantic import BaseModel


class EmployerProfileUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None


class EmployerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    description: str | None = None
    rating_avg: float