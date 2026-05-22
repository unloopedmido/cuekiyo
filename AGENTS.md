# Agent instructions

## Project

Local anime MV pipeline — see `README.md` for setup and manual verification.

## Conventions

- Backend: `backend/app/` — FastAPI, SQLAlchemy models in `models.py`, state machine in `state_machine.py`
- Pipeline services: `backend/app/services/`
- Jobs: `backend/app/jobs/runner.py` (background threads, global lock)
- Frontend: `frontend/src/` — React 19, Vite, shadcn/ui (`components.json`). Do not hand-edit `frontend/src/components/ui/*`; add or update via `npx shadcn@latest add`.
- Use subprocess **argument lists**, never shell string concatenation for yt-dlp/ffmpeg
- Project files only under `data/projects/{project_id}/` via `services/paths.py`

## State machine

Enforce transitions in `state_machine.py`. User-gated: `SONG_SELECTION`, `AWAITING_CANDIDATES`, `AWAITING_RENDER_ORDER`.

## Do not add

Redis, Celery, Docker requirement, Postgres, paid APIs, or cloud dependencies.
