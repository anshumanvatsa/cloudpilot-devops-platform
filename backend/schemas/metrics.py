from datetime import datetime

from pydantic import BaseModel


class MetricResponse(BaseModel):
    cpu: int
    memory: int
    request_count: int
    latency: int
    network: int
    timestamp: datetime


class MetricsEnvelope(BaseModel):
    source: str = "prometheus-compatible-simulator"
    points: list[MetricResponse]
