from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.csrf import validate_csrf_token
from core.dependencies import get_current_user, require_admin
from core.rate_limiter import limiter
from db.session import get_db
from models.user import User
from schemas.deployment import DeploymentCreate, DeploymentResponse
from services.deployment_service import DeploymentService

router = APIRouter(prefix="/deployments", tags=["deployments"])


@router.get("", response_model=list[DeploymentResponse])
@limiter.limit("60/minute")
def list_deployments(request: Request, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DeploymentService.list_deployments(db)


@router.post("", response_model=DeploymentResponse)
@limiter.limit("20/minute")
def create_deployment(
    request: Request,
    payload: DeploymentCreate,
    _: None = Depends(validate_csrf_token),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return DeploymentService.create_deployment(payload, db)


@router.post("/{deployment_id}/restart", response_model=DeploymentResponse)
@limiter.limit("20/minute")
def restart_deployment(
    request: Request,
    deployment_id: int,
    _: None = Depends(validate_csrf_token),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return DeploymentService.restart_deployment(deployment_id, db)


@router.post("/{deployment_id}/rollback", response_model=DeploymentResponse)
@limiter.limit("20/minute")
def rollback_deployment(
    request: Request,
    deployment_id: int,
    _: None = Depends(validate_csrf_token),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return DeploymentService.rollback_deployment(deployment_id, db)
