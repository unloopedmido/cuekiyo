#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Checking system tools"
for cmd in yt-dlp ffmpeg ffprobe; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing: $cmd (install before running the pipeline)"
  else
    echo "OK: $cmd"
  fi
done

echo "==> Backend (Python 3.11+)"
cd "$ROOT/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt

echo "==> Frontend (Node 20+)"
cd "$ROOT/frontend"
npm ci

echo "==> Done. Start dev servers:"
echo "  Terminal 1: $ROOT/scripts/dev-backend.sh"
echo "  Terminal 2: $ROOT/scripts/dev-frontend.sh"
