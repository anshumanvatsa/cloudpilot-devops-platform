import asyncio
import random
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


class RealtimeHub:
    def __init__(self) -> None:
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        if channel in self.connections and websocket in self.connections[channel]:
            self.connections[channel].remove(websocket)

    async def broadcast(self, channel: str, message: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for connection in self.connections.get(channel, set()):
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for item in stale:
            self.disconnect(channel, item)


hub = RealtimeHub()


async def metrics_publisher() -> None:
    while True:
        payload = {
            "cpu": random.randint(25, 92),
            "memory": random.randint(38, 94),
            "latency": random.randint(45, 260),
            "request_count": random.randint(900, 6200),
            "network": random.randint(90, 700),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await hub.broadcast("metrics", payload)
        await asyncio.sleep(2)


async def logs_publisher() -> None:
    services = ["api-gateway", "auth-service", "payment-service", "web-frontend"]
    levels = ["info", "warn", "error", "debug"]

    while True:
        service = random.choice(services)
        level = random.choice(levels)
        payload = {
            "service": service,
            "level": level,
            "message": f"[{service}] live event {random.randint(1000, 9999)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await hub.broadcast("logs", payload)
        await asyncio.sleep(1)
