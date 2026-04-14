import random
import string

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.deployment import Deployment
from models.log import Log
from schemas.deployment import DeploymentCreate


class DeploymentService:
    @staticmethod
    def list_deployments(db: Session) -> list[Deployment]:
        return db.query(Deployment).order_by(Deployment.created_at.desc()).all()

    @staticmethod
    def create_deployment(payload: DeploymentCreate, db: Session) -> Deployment:
        deployment = Deployment(
            name=payload.name,
            branch=payload.branch,
            status="building",
            environment=payload.environment,
            commit="".join(random.choices(string.hexdigits.lower(), k=7)),
            author=payload.author,
            duration="-",
            cpu=random.randint(25, 85),
            requests_per_min=random.randint(900, 6200),
        )
        db.add(deployment)
        db.flush()

        db.add(
            Log(
                message=f"[{deployment.name}] Deployment created for branch {deployment.branch}",
                level="info",
                service=deployment.name,
            )
        )
        db.commit()
        db.refresh(deployment)
        return deployment

    @staticmethod
    def restart_deployment(deployment_id: int, db: Session) -> Deployment:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found")

        deployment.status = "pending"
        deployment.duration = "-"
        db.add(Log(message=f"[{deployment.name}] Restart initiated", level="warn", service=deployment.name))
        db.commit()
        db.refresh(deployment)
        return deployment

    @staticmethod
    def rollback_deployment(deployment_id: int, db: Session) -> Deployment:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found")

        deployment.status = "building"
        deployment.branch = "main"
        deployment.duration = "-"
        db.add(Log(message=f"[{deployment.name}] Rollback initiated to main", level="warn", service=deployment.name))
        db.commit()
        db.refresh(deployment)
        return deployment
