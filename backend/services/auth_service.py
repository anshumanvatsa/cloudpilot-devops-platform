from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from core.config import get_settings
from core.security import create_access_token, create_refresh_token, decode_refresh_token, get_password_hash, verify_password
from models.user import User
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse

settings = get_settings()


class AuthService:
    @staticmethod
    def login(payload: LoginRequest, db: Session) -> tuple[TokenResponse, str]:
        print("LOGIN ATTEMPT:", payload.email)
        user = db.query(User).filter(User.email == payload.email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        print("Stored hash:", user.password_hash)
        print("Length:", len(user.password_hash))

        try:
            valid_password = verify_password(payload.password, user.password_hash)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not valid_password:
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
    def register(payload: RegisterRequest, db: Session) -> User:
        existing_user = db.query(User).filter(User.email == payload.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user = User(
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            role=payload.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

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
