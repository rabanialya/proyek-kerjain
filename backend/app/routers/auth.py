from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as SQLModelSession, select

from app.database import engine
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

from app.utils.jwt import create_access_token
from app.utils.security import hash_password, verify_password
from app.utils.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


def get_session():
    with SQLModelSession(engine) as session:
        yield session


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201
)
def register(
    data: RegisterRequest,
    session: SQLModelSession = Depends(get_session)
):
    existing_user = session.exec(
        select(User).where(User.email == data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email sudah terdaftar"
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    return user

@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    data: LoginRequest,
    session: SQLModelSession = Depends(get_session)
):
    user = session.exec(
        select(User).where(User.email == data.email)
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email atau password salah"
        )

    if not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Email atau password salah"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Akun Anda sedang dinonaktifkan"
        )

    access_token = create_access_token(
        str(user.id)
    )

    return TokenResponse(
        access_token=access_token
    )

@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user