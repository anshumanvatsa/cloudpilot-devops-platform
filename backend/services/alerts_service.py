from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.alert import Alert


class AlertsService:
    @staticmethod
    def list_alerts(db: Session) -> list[Alert]:
        return db.query(Alert).order_by(Alert.created_at.desc()).all()

    @staticmethod
    def acknowledge(alert_id: int, db: Session) -> Alert:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

        alert.acknowledged = True
        alert.status = "acknowledged"
        db.commit()
        db.refresh(alert)
        return alert
