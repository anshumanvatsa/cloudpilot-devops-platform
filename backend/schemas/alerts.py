from datetime import datetime

from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: int
    title: str
    message: str
    severity: str
    status: str
    acknowledged: bool
    timestamp: datetime


class AcknowledgeResponse(BaseModel):
    id: int
    acknowledged: bool
    status: str
