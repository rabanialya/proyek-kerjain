from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import engine
from app.models.category import Category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)


router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


def get_session():
    with Session(engine) as session:
        yield session


@router.get(
    "",
    response_model=list[CategoryResponse]
)
def get_categories(
    session: Session = Depends(get_session),
):
    statement = select(Category)
    categories = session.exec(statement).all()

    return categories


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=201,
)
def create_category(
    data: CategoryCreate,
    session: Session = Depends(get_session),
):
    existing_category = session.exec(
        select(Category).where(
            Category.name == data.name
        )
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category sudah ada",
        )

    category = Category(
        name=data.name
    )

    session.add(category)
    session.commit()
    session.refresh(category)

    return category


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
)
def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    session: Session = Depends(get_session),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    if data.name is not None:
        category.name = data.name

    if data.is_active is not None:
        category.is_active = data.is_active

    session.add(category)
    session.commit()
    session.refresh(category)

    return category


@router.delete(
    "/{category_id}"
)
def delete_category(
    category_id: UUID,
    session: Session = Depends(get_session),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    session.delete(category)
    session.commit()

    return {
        "message": "Category berhasil dihapus"
    }