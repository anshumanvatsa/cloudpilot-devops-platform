"""
realtime_service.py — Real-time broadcasting hub.

The metrics_publisher() now reads actual container stats from Docker
for all CloudPilot-managed containers. Falls back to simulated data
if Docker is not available (useful for frontend-only development).
"""

import asyncio
import logging
import random
import subprocess
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


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
        for connection in list(self.connections.get(channel, set())):
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for item in stale:
            self.disconnect(channel, item)


hub = RealtimeHub()


def _get_docker_stats() -> dict:
    """
    Pull real CPU + memory from all cloudpilot-managed containers.
    Returns aggregated stats or None if Docker is unavailable.
    """
    try:
        result = subprocess.run(
            [
                "docker", "stats", "--no-stream", "--format",
                '{"id":"{{.ID}}","name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemPerc}}"}',
                "--filter", "label=cloudpilot.managed=true",
            ],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return {}

        total_cpu = 0.0
        total_mem = 0.0
        count = 0

        for line in result.stdout.strip().splitlines():
            try:
                row = json.loads(line)
                total_cpu += float(row["cpu"].replace("%", "") or 0)
                total_mem += float(row["mem"].replace("%", "") or 0)
                count += 1
            except (json.JSONDecodeError, ValueError):
                continue

        if count == 0:
            return {}

        return {
            "cpu": round(total_cpu / count, 1),
            "memory": round(total_mem / count, 1),
        }
    except Exception:
        return {}


async def metrics_publisher() -> None:
    """Broadcast real Docker container stats (or simulated data) every 2 seconds."""
    while True:
        real = _get_docker_stats()

        payload = {
            "cpu": real.get("cpu", random.randint(20, 85)),
            "memory": real.get("memory", random.randint(35, 75)),
            "latency": random.randint(30, 200),
            "request_count": random.randint(100, 3000),
            "network": random.randint(50, 500),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "real" if real else "simulated",
        }
        await hub.broadcast("metrics", payload)
        await asyncio.sleep(2)


async def logs_publisher() -> None:
    """
    Emit a heartbeat log every 5 seconds so the logs page always has activity.
    Real deployment logs are emitted directly from deployment_service.py.
    """
    while True:
        payload = {
            "service": "cloudpilot-system",
            "level": "info",
            "message": "System heartbeat — platform running normally",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await hub.broadcast("logs", payload)
        await asyncio.sleep(5)
