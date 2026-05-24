#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Cuekiyo setup"
echo "============="

missing=0
for cmd in python3 node npm ffmpeg ffprobe yt-dlp; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  ok  $cmd"
  else
    echo "  missing  $cmd"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo
  echo "Install the missing tools first. See README.md for platform commands."
  exit 1
fi

echo
echo "Backend (Python venv)..."
cd "$ROOT/backend"
python3 -m venv .venv
./.venv/bin/pip install -q -U pip
./.venv/bin/pip install -q -r requirements-dev.txt

echo "Frontend..."
cd "$ROOT/frontend"
npm ci

echo "Root tooling..."
cd "$ROOT"
npm install

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example"
fi

echo
echo "Setup complete."
echo "  npm run dev     — development (frontend + backend)"
echo "  npm start       — production-style single port on http://127.0.0.1:8000"
