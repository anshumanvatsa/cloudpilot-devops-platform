"""
stream.py — WebSocket endpoints for real-time streaming.

/ws/metrics — broadcasts live metrics (CPU/memory from Docker or simulated)
/ws/logs    — broadcasts structured log events from all deployments
/ws/build/{deployment_id} — per-deployment build log stream
"""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.deployment_service import get_build_queue
from services.realtime_service import hub

router = APIRouter()


@router.websocket("/ws/metrics")
async def metrics_stream(websocket: WebSocket):
    await hub.connect("metrics", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect("metrics", websocket)


@router.websocket("/ws/logs")
async def logs_stream(websocket: WebSocket):
    await hub.connect("logs", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect("logs", websocket)


@router.websocket("/ws/build/{deployment_id}")
async def build_logs_stream(websocket: WebSocket, deployment_id: int):
    """
    Streams real-time build logs for a specific deployment.
    The client receives one JSON object per log line:
      { "line": "...", "done": false }
    When the build finishes:
      { "line": "", "done": true, "url": "http://localhost:XXXX" }   (success)
      { "line": "", "done": true, "failed": true }                    (failure)
    """
    await websocket.accept()
    queue = get_build_queue(deployment_id)

    try:
        while True:
            try:
                line: str = await asyncio.wait_for(queue.get(), timeout=60.0)
            except asyncio.TimeoutError:
                # Keep-alive ping
                await websocket.send_json({"ping": True})
                continue

            if line.startswith("__DONE__:"):
                url = line[len("__DONE__:"):]
                await websocket.send_json({"line": "", "done": True, "url": url})
                break
            elif line == "__FAILED__":
                await websocket.send_json({"line": "", "done": True, "failed": True})
                break
            else:
                await websocket.send_json({"line": line, "done": False})

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
