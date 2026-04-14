from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.realtime_service import hub

router = APIRouter()


@router.websocket('/ws/metrics')
async def metrics_stream(websocket: WebSocket):
    await hub.connect("metrics", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect("metrics", websocket)


@router.websocket('/ws/logs')
async def logs_stream(websocket: WebSocket):
    await hub.connect("logs", websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect("logs", websocket)
