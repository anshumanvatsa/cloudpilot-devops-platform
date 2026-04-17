from sqlalchemy.orm import Session

from core.security import get_password_hash, verify_password
from models.user import User


def seed_admin_user(db: Session) -> None:
    admin_email = "admin@cloudpilot.io"
    admin = db.query(User).filter(User.email == admin_email).first()

    if admin:
        try:
            valid_admin_password = verify_password("admin123", admin.password_hash)
        except ValueError:
            valid_admin_password = False

        if not valid_admin_password:
            admin.password_hash = get_password_hash("admin123")
            admin.role = "admin"
            db.add(admin)
            db.commit()
        return

    admin = User(
        email=admin_email,
        password_hash=get_password_hash("admin123"),
        role="admin",
    )
    db.add(admin)
    db.commit()
