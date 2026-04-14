import json
import random
from datetime import datetime, timezone

from redis import Redis
from sqlalchemy.orm import Session

from models.metric import Metric
from schemas.metrics import MetricResponse, MetricsEnvelope


class MetricsService:
    CACHE_KEY = "cloudpilot:metrics:last"

    @staticmethod
    def generate_metric_point() -> MetricResponse:
        return MetricResponse(
            cpu=random.randint(25, 92),
            memory=random.randint(38, 94),
            request_count=random.randint(900, 6200),
            latency=random.randint(45, 260),
            network=random.randint(90, 700),
            timestamp=datetime.now(timezone.utc),
        )

    @staticmethod
    def get_metrics(db: Session, redis_client: Redis | None = None) -> MetricsEnvelope:
        points: list[MetricResponse] = []

        if redis_client:
            cached = redis_client.get(MetricsService.CACHE_KEY)
            if cached:
                raw_items = json.loads(cached)
                points = [MetricResponse(**item) for item in raw_items]

        if not points:
            rows = db.query(Metric).order_by(Metric.created_at.desc()).limit(20).all()
            points = [
                MetricResponse(
                    cpu=row.cpu,
                    memory=row.memory,
                    request_count=row.request_count,
                    latency=row.latency,
                    network=row.network,
                    timestamp=row.created_at,
                )
                for row in rows
            ]

        # Keep shape realistic when no historical data exists.
        if not points:
            points = [MetricsService.generate_metric_point() for _ in range(10)]

        points = sorted(points, key=lambda item: item.timestamp)

        # Write fresh sample point to DB for progressive history.
        latest = MetricsService.generate_metric_point()
        db.add(
            Metric(
                cpu=latest.cpu,
                memory=latest.memory,
                request_count=latest.request_count,
                latency=latest.latency,
                network=latest.network,
            )
        )
        db.commit()

        merged = [*points[-19:], latest]

        if redis_client:
            redis_client.setex(
                MetricsService.CACHE_KEY,
                20,
                json.dumps([point.model_dump(mode="json") for point in merged]),
            )

        return MetricsEnvelope(points=merged)
