from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DeploymentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    repo_url: str = Field(description="GitHub HTTPS URL, e.g. https://github.com/user/repo")
    branch: str = "main"
    environment: str = "Production"
    author: str = "system"
    port: int = Field(default=3000, description="Port the app listens on inside the container")


class DeploymentResponse(BaseModel):
    id: int
    name: str
    branch: str
    status: str
    environment: str
    commit: str
    author: str
    duration: str
    cpu: int
    requests_per_min: int
    created_at: datetime
    updated_at: datetime

    # Real deployment fields
    repo_url: Optional[str] = None
    port: Optional[int] = None
    host_port: Optional[int] = None
    url: Optional[str] = None
    container_id: Optional[str] = None
    image_tag: Optional[str] = None

    model_config = {"from_attributes": True}
