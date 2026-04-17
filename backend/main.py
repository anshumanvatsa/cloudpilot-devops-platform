import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.routes import alerts, auth, deployments, logs, metrics
from api.websockets.stream import router as ws_router
from core.config import get_settings
from core.exceptions import register_exception_handlers
from core.middleware import register_middleware
from core.rate_limiter import limiter
from db.base import Base
from db.session import engine, SessionLocal
from services.realtime_service import logs_publisher, metrics_publisher
from utils.seed import seed_admin_user

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_admin_user(session)

    metrics_task = asyncio.create_task(metrics_publisher())
    logs_task = asyncio.create_task(logs_publisher())
    try:
        yield
    finally:
        metrics_task.cancel()
        logs_task.cancel()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_middleware(app)
register_exception_handlers(app)


@app.get('/ready')
async def readiness():
    return {"status": "ready"}


@app.middleware("http")
async def add_rate_limit(request: Request, call_next):
    response = await call_next(request)
    return response


@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})


api_prefix = settings.api_prefix
app.include_router(auth.router, prefix=api_prefix)
app.include_router(deployments.router, prefix=api_prefix)
app.include_router(metrics.router, prefix=api_prefix)
app.include_router(logs.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(ws_router)
