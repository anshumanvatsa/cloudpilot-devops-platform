from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.rate_limiter import limiter
from db.redis import get_redis
from db.session import get_db
from models.user import User
from schemas.metrics import MetricsEnvelope
from services.metrics_service import MetricsService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", response_model=MetricsEnvelope)
@limiter.limit("60/minute")
def get_metrics(request: Request, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    redis_client = get_redis()
    return MetricsService.get_metrics(db, redis_client)
