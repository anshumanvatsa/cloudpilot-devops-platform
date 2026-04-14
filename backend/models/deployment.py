from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    branch: Mapped[str] = mapped_column(String(120), nullable=False, default="main")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    environment: Mapped[str] = mapped_column(String(32), nullable=False, default="Production")
    commit: Mapped[str] = mapped_column(String(40), nullable=False, default="unknown")
    author: Mapped[str] = mapped_column(String(120), nullable=False, default="system")
    duration: Mapped[str] = mapped_column(String(32), nullable=False, default="-")
    cpu: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requests_per_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
