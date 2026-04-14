# CloudPilot Backend

Production-grade FastAPI backend for CloudPilot Console.

## Architecture Diagram (Text)

```text
[React CloudPilot Console]
        |
        | HTTPS / WebSocket
        v
[FastAPI API Gateway + WS Hub]
        |
        +--> Auth Service (JWT, Refresh, RBAC)
        +--> Deployment Service (create/restart/rollback)
        +--> Metrics Service (Prom-style shape + cache)
        +--> Logs Service (query/filter/pagination)
        +--> Alerts Service (list/ack)
        |
        +--> PostgreSQL (source of truth)
        |
        +--> Redis (metrics cache, optional pub/sub expansion)
```

## Service Responsibilities

- API Gateway: routing, validation, auth dependencies, rate limits, middleware, health.
- Auth Service: login, refresh, token issuing, password verification, role checks.
- Deployment Service: deployment lifecycle, state transitions, deployment logs.
- Metrics Service: collects/simulates metric points, persists history, caches recent points.
- Logs Service: paginated, filterable, searchable log retrieval.
- Alerts Service: alert listing and acknowledgement workflow.
- WebSocket Hub: real-time metrics/log stream fan-out to dashboard clients.

## Folder Structure

```text
backend/
  api/
    routes/
      auth.py
      deployments.py
      metrics.py
      logs.py
      alerts.py
    websockets/
      stream.py
  core/
    config.py
    dependencies.py
    exceptions.py
    middleware.py
    rate_limiter.py
    security.py
  db/
    base.py
    session.py
    redis.py
  models/
    user.py
    deployment.py
    log.py
    metric.py
    alert.py
  schemas/
    auth.py
    deployment.py
    metrics.py
    logs.py
    alerts.py
  services/
    auth_service.py
    deployment_service.py
    metrics_service.py
    logs_service.py
    alerts_service.py
    realtime_service.py
  alembic/
    env.py
    versions/
      20260413_01_initial_schema.py
  Dockerfile
  main.py
```

## API Examples (Frontend-Compatible)

### GET /api/deployments
```json
[
  {
    "id": 1,
    "name": "api-gateway",
    "branch": "main",
    "status": "building",
    "environment": "Production",
    "commit": "a1b2c3d",
    "author": "sarah@cloudpilot.io",
    "duration": "-",
    "cpu": 63,
    "requests_per_min": 4200,
    "created_at": "2026-04-13T12:00:00Z"
  }
]
```

### GET /api/metrics
```json
{
  "source": "prometheus-compatible-simulator",
  "points": [
    {
      "cpu": 58,
      "memory": 71,
      "request_count": 4300,
      "latency": 126,
      "network": 332,
      "timestamp": "2026-04-13T12:00:00Z"
    }
  ]
}
```

### GET /api/logs?page=1&page_size=50&level=error&q=timeout
```json
{
  "items": [
    {
      "id": 10,
      "message": "[payment-service] timeout after 5000ms",
      "level": "error",
      "service": "payment-service",
      "timestamp": "2026-04-13T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50
}
```

## Local Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Docker Run

From repository root:

```bash
docker compose up --build
```

## Health Endpoints

- GET /health
- GET /ready

## Default Seed User

- email: admin@cloudpilot.io
- password: Admin@12345

Change immediately in non-dev environments.
