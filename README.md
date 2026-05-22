# Anime MV Pipeline

Local web dashboard for building anime opening/ending music video compilations.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind 4, shadcn/ui |
| Backend | FastAPI, SQLite, SQLAlchemy |
| Media | yt-dlp, ffmpeg/ffprobe (drawtext overlays) |
| Metadata | Jikan API, YouTube via yt-dlp |

## Requirements

- **Python** 3.11 or 3.12 ([`.python-version`](.python-version))
- **Node.js** 20 LTS ([`.nvmrc`](.nvmrc))
- **System tools:** `yt-dlp`, `ffmpeg`, `ffprobe`
- **Font** for overlays (e.g. DejaVu on Linux, Arial on Windows)

### Install system tools

**Linux (Arch/CachyOS)**

```bash
sudo pacman -S yt-dlp ffmpeg ttf-dejavu
```

**Windows (winget)**

```powershell
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

## Quick start

### Linux / macOS

```bash
git clone git@github.com:unloopedmido/video-pipeline.git
cd video-pipeline
chmod +x scripts/*.sh
./scripts/setup.sh

# Terminal 1
./scripts/dev-backend.sh

# Terminal 2
./scripts/dev-frontend.sh
```

Open http://localhost:5173

### Windows (PowerShell)

```powershell
git clone git@github.com:unloopedmido/video-pipeline.git
cd video-pipeline
.\scripts\setup.ps1

# Terminal 1
.\scripts\dev-backend.ps1

# Terminal 2
.\scripts\dev-frontend.ps1
```

Open http://localhost:5173

## Manual setup

### Backend

```bash
cd backend
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows
.\.venv\Scripts\Activate.ps1

pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

API docs: http://127.0.0.1:8000/docs

Health check: http://127.0.0.1:8000/api/system/binaries — all four entries should be available.

## Environment

Copy [`.env.example`](.env.example) to `.env` if you need overrides. All settings use the `AMV_` prefix (see `backend/app/config.py`).

## Pipeline flow

1. Create project → load themes (Jikan)
2. Select songs → auto-source YouTube candidates
3. Pick one candidate per song → download through overlay stages
4. Confirm render order → final MP4

## SmallCode skills

Agent skills live under `.agents/`. SmallCode reads flat files from `.smallcode/skills/` instead. See [SMALLCODE_SKILLS.md](SMALLCODE_SKILLS.md) — keep the flat files in sync after editing `.agents/` skills, then use `/skill list` in SmallCode.

## Tests

```bash
cd backend
source .venv/bin/activate   # or .\.venv\Scripts\Activate.ps1
pytest -q
```

```bash
cd frontend
npm ci
npm run build
npm test
```

CI runs both on push (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Data layout

| Path | Purpose |
|------|---------|
| `data/pipeline.db` | SQLite database |
| `data/projects/{id}/` | Downloads, clips, output |

These paths are gitignored. Delete `data/pipeline.db` for a clean slate.

## Cross-platform notes

- SQLite paths use forward slashes internally (Windows-safe).
- Output folder opens via `xdg-open` (Linux), `open` (macOS), or `explorer` (Windows).
- Overlay fonts: Linux uses DejaVu/Liberation; Windows falls back via `fc-match` or bundled paths.

## Known limitations (V1)

- Single global job lock — one pipeline job at a time
- Concat xfade chain is simplified for 2+ clips
- Retry infers failed stage from the last failed job

## License

MIT — see [LICENSE](LICENSE).
