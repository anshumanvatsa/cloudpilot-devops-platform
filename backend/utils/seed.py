from sqlalchemy.orm import Session

from core.security import get_password_hash
from models.user import User


def seed_admin_user(db: Session) -> None:
    existing = db.query(User).first()
    if existing:
        return

    admin = User(
        email="admin@cloudpilot.io",
        password_hash=get_password_hash("admin123"),
        role="admin",
    )
    db.add(admin)
    db.commit()
