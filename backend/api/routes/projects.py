"""
projects.py — Projects API route.

A "project" is a logical grouping of deployments by service name.
Returns one entry per unique service name with the latest deployment metadata.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.rate_limiter import limiter
from db.session import get_db
from models.deployment import Deployment
from models.user import User

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
@limiter.limit("60/minute")
def list_projects(
    request: Request,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return one entry per unique service/project name, showing:
    - Latest deployment status and URL
    - All deployment history for that project
    - Total deployment count
    """
    all_deployments = db.query(Deployment).order_by(Deployment.created_at.desc()).all()

    projects: dict[str, dict] = {}
    for dep in all_deployments:
        if dep.name not in projects:
            projects[dep.name] = {
                "name": dep.name,
                "latest": {
                    "id": dep.id,
                    "status": dep.status,
                    "commit": dep.commit,
                    "branch": dep.branch,
                    "environment": dep.environment,
                    "url": dep.url,
                    "host_port": dep.host_port,
                    "created_at": dep.created_at.isoformat(),
                    "duration": dep.duration,
                    "author": dep.author,
                    "repo_url": dep.repo_url,
                },
                "total_deployments": 0,
                "deployments": [],
            }
        projects[dep.name]["total_deployments"] += 1
        projects[dep.name]["deployments"].append({
            "id": dep.id,
            "status": dep.status,
            "commit": dep.commit,
            "branch": dep.branch,
            "created_at": dep.created_at.isoformat(),
            "url": dep.url,
            "duration": dep.duration,
        })

    return list(projects.values())
