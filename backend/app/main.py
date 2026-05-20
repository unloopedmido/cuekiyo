import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.database import init_db
from app.jobs.runner import job_runner

app = FastAPI(title="Anime MV Pipeline", version="1.0.0")

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
    loop = asyncio.get_event_loop()
    job_runner.set_event_loop(loop)


@app.get("/")
def root():
    return {"app": "anime-mv-pipeline", "docs": "/docs"}
