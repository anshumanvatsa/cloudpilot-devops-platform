"""
docker_service.py — Core Docker + Git integration for real deployments.

Responsibilities:
  1. git clone a repo to a temp build directory
  2. docker build an image from that directory
  3. docker run the image, assigning a free host port
  4. Stream build logs line-by-line via an async generator
  5. Stop / remove containers for restart and rollback
  6. Return container stats (CPU, memory) for real metrics
"""

import asyncio
import logging
import os
import shutil
import socket
import subprocess
import tempfile
from pathlib import Path
from typing import AsyncIterator, Optional

logger = logging.getLogger(__name__)

BUILD_BASE = Path(os.environ.get("BUILD_DIR", "/tmp/cloudpilot_builds"))
BUILD_BASE.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Port helpers
# ---------------------------------------------------------------------------

def _find_free_port(start: int = 4000, end: int = 9000) -> int:
    """Return a free TCP port on the host in [start, end)."""
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue
    raise RuntimeError("No free port found in range")


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def clone_repo(repo_url: str, branch: str, build_dir: Path) -> str:
    """
    Shallow-clone *repo_url* at *branch* into *build_dir*.
    Returns the short HEAD commit SHA.
    """
    logger.info("Cloning %s @ %s → %s", repo_url, branch, build_dir)

    # Support both HTTPS and SSH; for private repos the user must pre-configure
    # an SSH key or pass a token in the URL.
    cmd = [
        "git", "clone",
        "--depth", "1",
        "--branch", branch,
        repo_url,
        str(build_dir),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"git clone failed:\n{result.stderr}")

    sha_result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=str(build_dir),
        capture_output=True,
        text=True,
    )
    return sha_result.stdout.strip() or "unknown"


# ---------------------------------------------------------------------------
# Docker build (async streaming)
# ---------------------------------------------------------------------------

async def build_image_stream(
    build_dir: Path,
    image_tag: str,
) -> AsyncIterator[str]:
    """
    Run `docker build` and yield each log line as it arrives.
    Raises RuntimeError if the build fails.
    """
    cmd = [
        "docker", "build",
        "--tag", image_tag,
        "--file", str(build_dir / "Dockerfile"),
        str(build_dir),
    ]
    logger.info("Building image %s from %s", image_tag, build_dir)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    assert proc.stdout is not None
    async for raw_line in proc.stdout:
        line = raw_line.decode(errors="replace").rstrip()
        yield line

    await proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"docker build exited with code {proc.returncode}")


# ---------------------------------------------------------------------------
# Docker run
# ---------------------------------------------------------------------------

def run_container(
    image_tag: str,
    container_name: str,
    app_port: int,
    env_vars: Optional[dict] = None,
) -> tuple[str, int]:
    """
    Run a container from *image_tag*, mapping *app_port* inside to a free host port.
    Returns (container_id, host_port).
    """
    host_port = _find_free_port()
    env_flags: list[str] = []
    for key, value in (env_vars or {}).items():
        env_flags += ["-e", f"{key}={value}"]

    cmd = [
        "docker", "run",
        "--detach",
        "--name", container_name,
        "--restart", "unless-stopped",
        "--publish", f"{host_port}:{app_port}",
        # Traefik labels so traffic can be routed by subdomain later
        "--label", "cloudpilot.managed=true",
        "--label", f"cloudpilot.service={container_name}",
        "--label", f"traefik.enable=true",
        "--label", f"traefik.http.routers.{container_name}.rule=Host(`{container_name}.localhost`)",
        "--label", f"traefik.http.services.{container_name}.loadbalancer.server.port={app_port}",
        *env_flags,
        image_tag,
    ]
    logger.info("Running container: %s", " ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"docker run failed:\n{result.stderr}")

    container_id = result.stdout.strip()
    return container_id, host_port


# ---------------------------------------------------------------------------
# Stop / remove container
# ---------------------------------------------------------------------------

def stop_container(container_id: str) -> None:
    """Stop and remove a container by ID or name (best-effort)."""
    for subcmd in (["docker", "stop", container_id], ["docker", "rm", "-f", container_id]):
        result = subprocess.run(subcmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.warning("docker %s %s: %s", subcmd[1], container_id, result.stderr.strip())


# ---------------------------------------------------------------------------
# Container stats (for real CPU / RPM metrics)
# ---------------------------------------------------------------------------

def get_container_stats(container_id: str) -> dict:
    """Return real-time stats snapshot from a running container."""
    result = subprocess.run(
        ["docker", "stats", "--no-stream", "--format",
         "{{.CPUPerc}}\t{{.MemUsage}}", container_id],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return {"cpu": 0, "memory": "0MiB / 0GiB"}

    parts = result.stdout.strip().split("\t")
    cpu_str = parts[0].replace("%", "").strip() if parts else "0"
    try:
        cpu = int(float(cpu_str))
    except ValueError:
        cpu = 0
    return {"cpu": cpu, "memory": parts[1] if len(parts) > 1 else ""}


# ---------------------------------------------------------------------------
# Cleanup build directory
# ---------------------------------------------------------------------------

def cleanup_build_dir(build_dir: Path) -> None:
    try:
        shutil.rmtree(build_dir)
    except Exception as exc:
        logger.warning("Could not remove build dir %s: %s", build_dir, exc)
