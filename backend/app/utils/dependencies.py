from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session as SQLModelSession, select

from app.database import engine
from app.models.user import User
from app.utils.jwt import decode_access_token


security = HTTPBearer()


def get_session():
    with SQLModelSession(engine) as session:
        yield session


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: SQLModelSession = Depends(get_session),
) -> User:
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid",
            )

        user_uuid = UUID(user_id)

    except HTTPException:
        raise

    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau sudah expired",
        )

    user = session.exec(
        select(User).where(User.id == user_uuid)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User tidak ditemukan",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun Anda sedang dinonaktifkan",
        )

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses khusus admin",
        )

    return current_user