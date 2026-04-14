from datetime import datetime

from pydantic import BaseModel, Field


class DeploymentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    branch: str = "main"
    environment: str = "Production"
    author: str = "system"


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

    model_config = {"from_attributes": True}
