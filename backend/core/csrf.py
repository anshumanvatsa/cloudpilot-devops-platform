import secrets

from fastapi import HTTPException, Request, status


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def validate_csrf_token(
    request: Request,
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    cookie_token = request.cookies.get("csrf_token")
    csrf_header = request.headers.get("X-CSRF-Token")
    if not cookie_token or not csrf_header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CSRF token")

    if cookie_token != csrf_header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
