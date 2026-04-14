from datetime import datetime

from pydantic import BaseModel


class LogResponse(BaseModel):
    id: int
    message: str
    level: str
    service: str
    timestamp: datetime


class PaginatedLogsResponse(BaseModel):
    items: list[LogResponse]
    total: int
    page: int
    page_size: int
