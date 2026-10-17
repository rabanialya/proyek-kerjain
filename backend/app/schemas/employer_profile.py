from uuid import UUID

from pydantic import BaseModel, field_validator


class EmployerProfileCreate(BaseModel):
    display_name: str
    description: str | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("display_name tidak boleh kosong atau hanya berisi spasi")
        return v.strip()


class EmployerProfileUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("display_name tidak boleh berupa string kosong atau hanya berisi spasi")
        if v is not None:
            return v.strip()
        return v


class EmployerProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    description: str | None = None
    rating_avg: float
