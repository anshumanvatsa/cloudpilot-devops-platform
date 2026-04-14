from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import get_settings
from core.csrf import generate_csrf_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_token(subject: str, expires_minutes: int, token_type: str, extra: dict[str, Any] | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": token_type,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
    return create_token(subject, settings.access_token_expire_minutes, "access", {"role": role})


def create_refresh_token(subject: str) -> str:
    return create_token(subject, settings.refresh_token_expire_minutes, "refresh")


def decode_refresh_token(refresh_token: str) -> str:
    try:
        payload = jwt.decode(refresh_token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        email = payload.get("sub")
        if not email:
            raise ValueError("Missing subject")
        return str(email)
    except (JWTError, ValueError) as exc:
        raise ValueError("Invalid refresh token") from exc


def create_csrf_token() -> str:
    return generate_csrf_token()
