import re
from pydantic import field_validator
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    phone: str = Field(min_length=1)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Nomor telepon wajib diisi.")

        # Izinkan spasi, tanda hubung, dan tanda kurung sebagai pemisah.
        normalized = re.sub(r"[\s()-]", "", value)

        if not re.fullmatch(r"\+?\d{8,15}", normalized):
            raise ValueError(
                "Nomor telepon harus terdiri dari 8–15 digit "
                "dan boleh diawali tanda +."
            )

        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"