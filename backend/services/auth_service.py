from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from core.config import get_settings
from core.security import create_access_token, create_refresh_token, decode_refresh_token, verify_password
from models.user import User
from schemas.auth import LoginRequest, TokenResponse

settings = get_settings()


class AuthService:
    @staticmethod
    def login(payload: LoginRequest, db: Session) -> tuple[TokenResponse, str]:
        print("LOGIN ATTEMPT:", payload.email)
        user = db.query(User).filter(User.email == payload.email).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        refresh_token = create_refresh_token(subject=user.email)
        return (
            TokenResponse(
                access_token=create_access_token(subject=user.email, role=user.role),
                csrf_token="",
            ),
            refresh_token,
        )

    @staticmethod
    def refresh(refresh_token: str, db: Session) -> tuple[TokenResponse, str]:
        try:
            email = decode_refresh_token(refresh_token)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        new_refresh_token = create_refresh_token(subject=user.email)
        return (
            TokenResponse(
                access_token=create_access_token(subject=user.email, role=user.role),
                csrf_token="",
            ),
            new_refresh_token,
        )
