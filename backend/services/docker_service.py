"""
docker_service.py — Vercel-style auto-detecting deployment engine.

Project type detection (no Dockerfile needed):
  1. Dockerfile exists          → use it as-is
  2. package.json + vite/react  → npm run build → nginx static
  3. package.json (other)       → npm install + npm start (Node server)
  4. requirements.txt           → Python / gunicorn
  5. index.html (any level)     → pure static → nginx
  6. Fallback                   → nginx serving whatever is there
"""

import asyncio
import json
import logging
import os
import shutil
import socket
import subprocess
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
# Project type auto-detection (Vercel-style)
# ---------------------------------------------------------------------------

def detect_project_type(build_dir: Path) -> str:
    """
    Inspect the cloned repo and return one of:
      'dockerfile'  — has a Dockerfile, use it directly
      'react'       — package.json with vite/react-scripts build
      'node'        — package.json without a build step (Express, Fastify, etc.)
      'python'      — requirements.txt or Pipfile
      'static'      — plain HTML/CSS/JS (no build needed)
    """
    if (build_dir / "Dockerfile").exists():
        return "dockerfile"

    if (build_dir / "package.json").exists():
        try:
            pkg = json.loads((build_dir / "package.json").read_text())
            scripts = pkg.get("scripts", {})
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            # Has a build script AND uses a bundler → treat as static SPA
            has_build = "build" in scripts
            has_bundler = any(k in deps for k in ("vite", "react-scripts", "next", "nuxt", "@vitejs/plugin-react"))
            if has_build and has_bundler:
                return "react"
            # Has start script → Node server
            if "start" in scripts or "dev" in scripts:
                return "node"
        except Exception:
            pass
        return "node"

    if (build_dir / "requirements.txt").exists() or (build_dir / "Pipfile").exists():
        return "python"

    # Any HTML file anywhere → static site
    if list(build_dir.rglob("index.html")):
        return "static"

    # Default: serve whatever is there as static
    return "static"


def generate_dockerfile(build_dir: Path, project_type: str, app_port: int) -> None:
    """
    Write an auto-generated Dockerfile into build_dir based on the detected type.
    """
    dockerfile_path = build_dir / "Dockerfile"

    if project_type == "static":
        # Find the directory containing index.html (could be root, public/, dist/, etc.)
        html_files = list(build_dir.rglob("index.html"))
        if html_files:
            # Use the shallowest one
            html_dir = sorted(html_files, key=lambda p: len(p.parts))[0].parent
            relative = html_dir.relative_to(build_dir)
            copy_path = f"./{relative}" if str(relative) != "." else "."
        else:
            copy_path = "."

        dockerfile_path.write_text(f"""FROM nginx:alpine
COPY {copy_path} /usr/share/nginx/html
RUN echo 'server {{ listen {app_port}; location / {{ root /usr/share/nginx/html; try_files $uri $uri/ /index.html; }} }}' > /etc/nginx/conf.d/default.conf
EXPOSE {app_port}
CMD ["nginx", "-g", "daemon off;"]
""")

    elif project_type == "react":
        # Detect package manager
        pm = "npm"
        install_cmd = "npm ci --prefer-offline || npm install"
        build_cmd = "npm run build"

        # Find output dir from vite/react config
        out_dir = "dist"
        try:
            pkg = json.loads((build_dir / "package.json").read_text())
            scripts = pkg.get("scripts", {})
            if "react-scripts" in scripts.get("build", ""):
                out_dir = "build"
        except Exception:
            pass

        dockerfile_path.write_text(f"""FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN {install_cmd}
COPY . .
RUN {build_cmd}

FROM nginx:alpine
COPY --from=builder /app/{out_dir} /usr/share/nginx/html
RUN echo 'server {{ listen {app_port}; location / {{ root /usr/share/nginx/html; try_files $uri $uri/ /index.html; }} }}' > /etc/nginx/conf.d/default.conf
EXPOSE {app_port}
CMD ["nginx", "-g", "daemon off;"]
""")

    elif project_type == "node":
        dockerfile_path.write_text(f"""FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline || npm install --production
COPY . .
ENV PORT={app_port}
ENV NODE_ENV=production
EXPOSE {app_port}
CMD ["node", "$(node -e \\"const p=require('./package.json');console.log(p.main||'index.js')\\")"]
""")
        # Simpler fallback if main detection is tricky
        main_file = "index.js"
        try:
            pkg = json.loads((build_dir / "package.json").read_text())
            scripts = pkg.get("scripts", {})
            main_file = pkg.get("main", "index.js")
            start_script = scripts.get("start", f"node {main_file}")
        except Exception:
            start_script = f"node {main_file}"

        dockerfile_path.write_text(f"""FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline || npm install --production
COPY . .
ENV PORT={app_port}
ENV NODE_ENV=production
EXPOSE {app_port}
CMD {json.dumps(["sh", "-c", start_script])}
""")

    elif project_type == "python":
        # Detect entry point
        entry = "app.py"
        for candidate in ["app.py", "main.py", "server.py", "wsgi.py", "run.py"]:
            if (build_dir / candidate).exists():
                entry = candidate
                break

        dockerfile_path.write_text(f"""FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true
COPY . .
ENV PORT={app_port}
EXPOSE {app_port}
CMD ["python", "{entry}"]
""")


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def clone_repo(repo_url: str, branch: str, build_dir: Path) -> str:
    """
    Shallow-clone *repo_url* at *branch* into *build_dir*.
    Returns the short HEAD commit SHA.
    """
    logger.info("Cloning %s @ %s → %s", repo_url, branch, build_dir)
    cmd = [
        "git", "clone",
        "--depth", "1",
        "--branch", branch,
        repo_url,
        str(build_dir),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        # Try without --branch (some repos use 'master' or other defaults)
        cmd_no_branch = ["git", "clone", "--depth", "1", repo_url, str(build_dir)]
        result2 = subprocess.run(cmd_no_branch, capture_output=True, text=True, timeout=120)
        if result2.returncode != 0:
            raise RuntimeError(f"git clone failed:\n{result.stderr}\n{result2.stderr}")

    sha_result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=str(build_dir),
        capture_output=True,
        text=True,
    )
    return sha_result.stdout.strip() or "unknown"


# ---------------------------------------------------------------------------
# Docker build (async streaming) — with auto-detection
# ---------------------------------------------------------------------------

async def build_image_stream(
    build_dir: Path,
    image_tag: str,
    app_port: int = 3000,
) -> AsyncIterator[str]:
    """
    Auto-detect project type, generate Dockerfile if needed, then
    run `docker build` and yield each log line as it arrives.
    Raises RuntimeError if the build fails.
    """
    # Auto-detect and generate Dockerfile if missing
    if not (build_dir / "Dockerfile").exists():
        project_type = detect_project_type(build_dir)
        yield f"📋 Detected project type: {project_type} (auto-generating Dockerfile)"
        generate_dockerfile(build_dir, project_type, app_port)
        yield f"✅ Dockerfile generated for {project_type} project"
    else:
        yield "📋 Using existing Dockerfile"

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
        "--label", "cloudpilot.managed=true",
        "--label", f"cloudpilot.service={container_name}",
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
