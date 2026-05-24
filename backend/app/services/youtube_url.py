import json
import re
import subprocess

from app.services.youtube_sourcer import (
    CandidateResult,
    _extract_thumbnail,
    youtube_slot,
    youtube_thumbnail_url,
)

YOUTUBE_ID_PATTERN = re.compile(
    r"(?:youtube\.com/watch\?(?:[^&]*&)*v=|youtu\.be/|youtube\.com/shorts/)([A-Za-z0-9_-]{11})"
)
STANDALONE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")


def parse_youtube_id(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None
    match = YOUTUBE_ID_PATTERN.search(value)
    if match:
        return match.group(1)
    if STANDALONE_ID_PATTERN.fullmatch(value):
        return value
    return None


def normalize_youtube_url(value: str) -> str | None:
    video_id = parse_youtube_id(value)
    if not video_id:
        return None
    return f"https://www.youtube.com/watch?v={video_id}"


def _run_yt_dlp_json(url: str) -> dict:
    cmd = [
        "yt-dlp",
        url,
        "--dump-single-json",
        "--no-warnings",
        "--skip-download",
        "--no-playlist",
    ]
    with youtube_slot():
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "yt-dlp metadata fetch failed").strip()
        raise RuntimeError(detail)
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("yt-dlp returned invalid JSON") from exc
    if not data.get("id"):
        raise RuntimeError("Video not found or unavailable")
    return data


def fetch_video_metadata(url: str) -> dict:
    normalized = normalize_youtube_url(url)
    if not normalized:
        raise ValueError("Invalid YouTube URL")
    return _run_yt_dlp_json(normalized)


def metadata_to_candidate_result(entry: dict) -> CandidateResult:
    duration = entry.get("duration")
    views = entry.get("view_count")
    return CandidateResult(
        youtube_id=entry.get("id") or "",
        url=entry.get("webpage_url") or entry.get("url") or "",
        title=str(entry.get("title") or "Untitled"),
        uploader_name=entry.get("uploader") or entry.get("channel"),
        view_count=int(views) if views is not None else None,
        duration=float(duration) if duration is not None else None,
        thumbnail_url=_extract_thumbnail(entry) or youtube_thumbnail_url(entry.get("id")),
        score=1.0,
        rejection_flags=[],
        raw_metadata=entry,
    )
