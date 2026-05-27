"""
deployment_service.py — Real deployment pipeline.

Each create_deployment() call:
  1. Inserts a DB row with status="queued"
  2. Fires an async background task that:
     - Clones the GitHub repo
     - Runs docker build (streaming logs via WebSocket)
     - Runs docker run on a free port
     - Sets status → "success" (or "failed" on error)
     - Saves the public URL

Restart: stops + re-runs the same image tag.
Rollback: finds the last successful deployment for the same service, re-runs its image.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from db.session import SessionLocal
from models.deployment import Deployment
from models.log import Log
from schemas.deployment import DeploymentCreate
from services import docker_service
from services.realtime_service import hub

logger = logging.getLogger(__name__)

# In-memory store of per-deployment log lines for the /ws/build/<id> channel
# { deployment_id: asyncio.Queue }
_build_queues: dict[int, asyncio.Queue] = {}


def get_build_queue(deployment_id: int) -> asyncio.Queue:
    if deployment_id not in _build_queues:
        _build_queues[deployment_id] = asyncio.Queue(maxsize=2000)
    return _build_queues[deployment_id]


def _emit(deployment_id: int, line: str) -> None:
    """Push a log line to the in-memory queue (non-blocking)."""
    q = get_build_queue(deployment_id)
    try:
        q.put_nowait(line)
    except asyncio.QueueFull:
        pass  # drop if queue full — client was too slow


class DeploymentService:

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    def list_deployments(db: Session) -> list[Deployment]:
        return db.query(Deployment).order_by(Deployment.created_at.desc()).all()

    # ------------------------------------------------------------------
    # Create — returns immediately, pipeline runs in background
    # ------------------------------------------------------------------

    @staticmethod
    def create_deployment(payload: DeploymentCreate, db: Session) -> Deployment:
        deployment = Deployment(
            name=payload.name,
            branch=payload.branch,
            status="queued",
            environment=payload.environment,
            commit="pending",
            author=payload.author,
            duration="-",
            cpu=0,
            requests_per_min=0,
            repo_url=payload.repo_url,
            port=payload.port,
        )
        db.add(deployment)
        db.flush()
        db.add(Log(
            message=f"[{deployment.name}] Deployment queued for {payload.repo_url} @ {payload.branch}",
            level="info",
            service=deployment.name,
        ))
        db.commit()
        db.refresh(deployment)

        # Fire the pipeline in the background
        asyncio.ensure_future(DeploymentService._run_pipeline(deployment.id))
        return deployment

    # ------------------------------------------------------------------
    # Pipeline
    # ------------------------------------------------------------------

    @staticmethod
    async def _run_pipeline(deployment_id: int) -> None:
        """Full build pipeline running asynchronously."""

        def _update(db: Session, **kwargs) -> Deployment:
            dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
            if dep:
                for key, value in kwargs.items():
                    setattr(dep, key, value)
                db.commit()
                db.refresh(dep)
            return dep

        async def _broadcast(line: str, level: str = "info") -> None:
            """Broadcast to both the per-deployment channel and the global logs channel."""
            _emit(deployment_id, line)
            await hub.broadcast("logs", {
                "service": deployment_name,
                "level": level,
                "message": line,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        build_dir: Path | None = None

        with SessionLocal() as db:
            dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
            if not dep:
                return
            deployment_name = dep.name
            repo_url = dep.repo_url or ""
            branch = dep.branch
            app_port = dep.port or 3000
            environment = dep.environment

        start_time = time.time()

        try:
            # ── Step 1: clone ──────────────────────────────────────────
            with SessionLocal() as db:
                _update(db, status="cloning")
            await _broadcast(f"🔄 Cloning {repo_url} @ {branch}...")

            build_dir = docker_service.BUILD_BASE / f"{deployment_name}-{deployment_id}"
            build_dir.mkdir(parents=True, exist_ok=True)

            # Run blocking git clone in thread pool to avoid blocking event loop
            commit_sha = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: docker_service.clone_repo(repo_url, branch, build_dir),
            )
            await _broadcast(f"✅ Cloned. Commit: {commit_sha}")

            with SessionLocal() as db:
                _update(db, commit=commit_sha, status="building")

            # ── Step 2: docker build ───────────────────────────────────
            await _broadcast(f"🔨 Building Docker image...")
            image_tag = f"cloudpilot/{deployment_name}:{commit_sha}"
            full_log_lines: list[str] = []

            async for line in docker_service.build_image_stream(build_dir, image_tag, app_port):
                await _broadcast(line)
                full_log_lines.append(line)

            await _broadcast(f"✅ Image built: {image_tag}")

            # ── Step 3: docker run ─────────────────────────────────────
            await _broadcast(f"🚀 Starting container on port {app_port}...")
            container_name = f"cp-{deployment_name}-{deployment_id}"

            # Stop any old container with the same name
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: docker_service.stop_container(container_name)
            )

            container_id, host_port = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: docker_service.run_container(
                    image_tag,
                    container_name,
                    app_port,
                    env_vars={"NODE_ENV": environment.lower(), "PORT": str(app_port)},
                ),
            )

            from core.config import get_settings
            public_base = get_settings().public_base_url.rstrip("/")
            public_url = f"{public_base}:{host_port}"
            elapsed = round(time.time() - start_time, 1)
            duration_str = f"{elapsed}s"

            await _broadcast(f"✅ Container running: {public_url}", "info")

            with SessionLocal() as db:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = "success"
                    dep.container_id = container_id
                    dep.host_port = host_port
                    dep.image_tag = image_tag
                    dep.url = public_url
                    dep.duration = duration_str
                    dep.build_log = "\n".join(full_log_lines)
                    db.add(Log(
                        message=f"[{deployment_name}] Deployed successfully → {public_url}",
                        level="info",
                        service=deployment_name,
                    ))
                    db.commit()

            _emit(deployment_id, f"__DONE__:{public_url}")

        except Exception as exc:
            logger.exception("Deployment pipeline failed for %s", deployment_id)
            error_msg = str(exc)
            with SessionLocal() as db:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = "failed"
                    dep.duration = f"{round(time.time() - start_time, 1)}s"
                    dep.build_log = error_msg
                    db.add(Log(
                        message=f"[{deployment_name}] Deployment failed: {error_msg[:200]}",
                        level="error",
                        service=deployment_name,
                    ))
                    db.commit()

            await _broadcast(f"❌ Deployment failed: {error_msg}", "error")
            _emit(deployment_id, "__FAILED__")

        finally:
            if build_dir:
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda: docker_service.cleanup_build_dir(build_dir)
                )

    # ------------------------------------------------------------------
    # Restart
    # ------------------------------------------------------------------

    @staticmethod
    async def restart_deployment(deployment_id: int, db: Session) -> Deployment:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found")

        image_tag = deployment.image_tag
        app_port = deployment.port or 3000

        if not image_tag:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No image available — deployment must succeed before restart",
            )

        # Stop old container
        if deployment.container_id:
            container_name = f"cp-{deployment.name}-{deployment_id}"
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: docker_service.stop_container(container_name)
            )

        # Re-run same image
        container_name = f"cp-{deployment.name}-{deployment_id}"
        container_id, host_port = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: docker_service.run_container(image_tag, container_name, app_port),
        )

        deployment.status = "success"
        deployment.container_id = container_id
        deployment.host_port = host_port
        deployment.url = f"http://localhost:{host_port}"
        db.add(Log(
            message=f"[{deployment.name}] Restarted successfully",
            level="info",
            service=deployment.name,
        ))
        db.commit()
        db.refresh(deployment)
        return deployment

    # ------------------------------------------------------------------
    # Rollback
    # ------------------------------------------------------------------

    @staticmethod
    async def rollback_deployment(deployment_id: int, db: Session) -> Deployment:
        current = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deployment not found")

        # Find last successful deployment for same service (different from current)
        previous = (
            db.query(Deployment)
            .filter(
                Deployment.name == current.name,
                Deployment.id != current.id,
                Deployment.status == "success",
                Deployment.image_tag.isnot(None),
            )
            .order_by(Deployment.created_at.desc())
            .first()
        )

        if not previous:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No previous successful deployment found to roll back to",
            )

        # Stop current container
        if current.container_id:
            container_name = f"cp-{current.name}-{deployment_id}"
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: docker_service.stop_container(container_name)
            )

        # Re-run old image
        app_port = previous.port or 3000
        container_name = f"cp-{current.name}-{deployment_id}"
        container_id, host_port = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: docker_service.run_container(previous.image_tag, container_name, app_port),
        )

        current.status = "success"
        current.container_id = container_id
        current.host_port = host_port
        current.image_tag = previous.image_tag
        current.commit = previous.commit
        current.url = f"http://localhost:{host_port}"
        db.add(Log(
            message=f"[{current.name}] Rolled back to commit {previous.commit}",
            level="warn",
            service=current.name,
        ))
        db.commit()
        db.refresh(current)
        return current
