from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    name: str = Field(
        unique=True,
        index=True
    )

    is_active: bool = Field(default=True)