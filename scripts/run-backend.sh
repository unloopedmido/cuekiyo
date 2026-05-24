#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/backend/.venv/bin/python"

if [[ ! -x "$PY" ]]; then
  echo "Backend venv not found. Run: npm run setup" >&2
  exit 1
fi

cd "$ROOT/backend"
exec "$PY" -m uvicorn app.main:app "$@"
