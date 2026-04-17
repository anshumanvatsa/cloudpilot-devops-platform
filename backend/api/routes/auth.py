from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from core.rate_limiter import limiter
from core.dependencies import get_current_user
from core.config import get_settings
from core.csrf import validate_csrf_token
from db.session import get_db
from models.user import User
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _cookie_common_kwargs(max_age_seconds: int, httponly: bool):
    return {
        "max_age": max_age_seconds,
        "path": "/",
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain,
        "httponly": httponly,
    }


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(response: Response, request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    token_response, refresh_token = AuthService.login(payload, db)
    csrf_token = secrets.token_urlsafe(32)
    token_response.csrf_token = csrf_token

    refresh_max_age = settings.refresh_token_expire_minutes * 60
    response.set_cookie(
        settings.refresh_cookie_name,
        refresh_token,
        expires=datetime.now(timezone.utc) + timedelta(seconds=refresh_max_age),
        **_cookie_common_kwargs(refresh_max_age, httponly=True),
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        **_cookie_common_kwargs(refresh_max_age, httponly=False),
    )

    return token_response


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    return AuthService.register(payload, db)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
def refresh(response: Response, request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    token_response, new_refresh_token = AuthService.refresh(refresh_token, db)
    csrf_token = secrets.token_urlsafe(32)
    token_response.csrf_token = csrf_token
    refresh_max_age = settings.refresh_token_expire_minutes * 60

    response.set_cookie(
        settings.refresh_cookie_name,
        new_refresh_token,
        expires=datetime.now(timezone.utc) + timedelta(seconds=refresh_max_age),
        **_cookie_common_kwargs(refresh_max_age, httponly=True),
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        **_cookie_common_kwargs(refresh_max_age, httponly=False),
    )

    return token_response


@router.post("/logout")
@limiter.limit("20/minute")
def logout(response: Response, request: Request, _: None = Depends(validate_csrf_token)):
    response.delete_cookie(settings.refresh_cookie_name, path="/", domain=settings.cookie_domain)
    response.delete_cookie(settings.csrf_cookie_name, path="/", domain=settings.cookie_domain)
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
