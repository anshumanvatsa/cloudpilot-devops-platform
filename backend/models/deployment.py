from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    branch: Mapped[str] = mapped_column(String(120), nullable=False, default="main")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    environment: Mapped[str] = mapped_column(String(32), nullable=False, default="Production")
    commit: Mapped[str] = mapped_column(String(40), nullable=False, default="unknown")
    author: Mapped[str] = mapped_column(String(120), nullable=False, default="system")
    duration: Mapped[str] = mapped_column(String(32), nullable=False, default="-")
    cpu: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requests_per_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Real deployment fields
    repo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    host_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    container_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    image_tag: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    build_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_summary: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
