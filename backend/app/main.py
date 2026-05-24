import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.config import settings
from app.database import init_db
from app.jobs.runner import job_runner, recover_stale_pipeline_jobs
from app.services.paths import resolve_under_base

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"

app = FastAPI(title="Cuekiyo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    recover_stale_pipeline_jobs()
    loop = asyncio.get_event_loop()
    job_runner.set_event_loop(loop)


@app.get("/")
def root():
    if settings.serve_frontend and (_FRONTEND_DIST / "index.html").is_file():
        return FileResponse(_FRONTEND_DIST / "index.html")
    return {"app": "cuekiyo", "docs": "/docs"}


def _safe_frontend_path(full_path: str) -> Path | None:
    if not full_path or full_path.startswith("api"):
        return None
    return resolve_under_base(_FRONTEND_DIST, full_path)


if settings.serve_frontend and _FRONTEND_DIST.is_dir():
    assets_dir = _FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = _safe_frontend_path(full_path)
        if candidate is not None and candidate.is_file():
            return FileResponse(candidate)
        if (_FRONTEND_DIST / "index.html").is_file():
            return FileResponse(_FRONTEND_DIST / "index.html")
        raise HTTPException(status_code=404, detail="Frontend build not found")
