from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.rate_limiter import limiter
from db.session import get_db
from models.user import User
from schemas.logs import LogResponse, PaginatedLogsResponse
from services.logs_service import LogsService

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=PaginatedLogsResponse)
@limiter.limit("80/minute")
def list_logs(
    request: Request,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    level: str | None = Query(default=None),
    q: str | None = Query(default=None),
):
    logs, total = LogsService.list_logs(db, page=page, page_size=page_size, level=level, query=q)
    items = [
        LogResponse(
            id=item.id,
            message=item.message,
            level=item.level,
            service=item.service,
            timestamp=item.created_at,
        )
        for item in logs
    ]
    return PaginatedLogsResponse(items=items, total=total, page=page, page_size=page_size)
