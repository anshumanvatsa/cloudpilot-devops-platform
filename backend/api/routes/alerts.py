from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.csrf import validate_csrf_token
from core.dependencies import get_current_user
from core.rate_limiter import limiter
from db.session import get_db
from models.user import User
from schemas.alerts import AcknowledgeResponse, AlertResponse
from services.alerts_service import AlertsService

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
@limiter.limit("60/minute")
def list_alerts(request: Request, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = AlertsService.list_alerts(db)
    return [
        AlertResponse(
            id=item.id,
            title=item.title,
            message=item.message,
            severity=item.severity,
            status=item.status,
            acknowledged=item.acknowledged,
            timestamp=item.created_at,
        )
        for item in alerts
    ]


@router.post("/{alert_id}/acknowledge", response_model=AcknowledgeResponse)
@limiter.limit("30/minute")
def acknowledge_alert(
    request: Request,
    alert_id: int,
    _: None = Depends(validate_csrf_token),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = AlertsService.acknowledge(alert_id, db)
    return AcknowledgeResponse(id=item.id, acknowledged=item.acknowledged, status=item.status)
