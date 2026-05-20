$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "==> Checking system tools"
foreach ($cmd in @("yt-dlp", "ffmpeg", "ffprobe")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Missing: $cmd (install before running the pipeline)"
  } else {
    Write-Host "OK: $cmd"
  }
}

Write-Host "==> Backend (Python 3.11+)"
Set-Location "$Root\backend"
if (-not (Test-Path ".venv")) {
  python -m venv .venv
}
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt

Write-Host "==> Frontend (Node 20+)"
Set-Location "$Root\frontend"
npm ci

Write-Host "==> Done. Start dev servers:"
Write-Host "  Terminal 1: $Root\scripts\dev-backend.ps1"
Write-Host "  Terminal 2: $Root\scripts\dev-frontend.ps1"
