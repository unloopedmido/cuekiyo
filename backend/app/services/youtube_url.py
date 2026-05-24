import json
import re
import subprocess
from urllib.parse import parse_qs, urlparse

from app.services.youtube_sourcer import (
    CandidateResult,
    _extract_thumbnail,
    youtube_slot,
    youtube_thumbnail_url,
)

VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
_YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v={video_id}"


def _valid_video_id(value: str | None) -> str | None:
    if value and VIDEO_ID_PATTERN.fullmatch(value):
        return value
    return None


def parse_youtube_id(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None
    if (video_id := _valid_video_id(value)):
        return video_id

    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = parsed.netloc.lower().removeprefix("www.")

    if host == "youtu.be":
        segment = parsed.path.lstrip("/").split("/")[0]
        return _valid_video_id(segment)

    if host in {"youtube.com", "m.youtube.com"}:
        path = parsed.path.rstrip("/")
        if path == "/watch":
            return _watch_video_id(parsed.query)
        if path.startswith("/shorts/"):
            segment = path.removeprefix("/shorts/").split("/")[0]
            return _valid_video_id(segment)

    return None


def _watch_video_id(query: str) -> str | None:
    if not query:
        return None
    video_id = parse_qs(query).get("v", (None,))[0]
    if video_id:
        return _valid_video_id(video_id)
    marker = "v="
    idx = query.find(marker)
    if idx == -1:
        return None
    return _valid_video_id(query[idx + len(marker) : idx + len(marker) + 11])


def normalize_youtube_url(value: str) -> str | None:
    video_id = parse_youtube_id(value)
    if not video_id:
        return None
    return _YOUTUBE_WATCH_URL.format(video_id=video_id)


def _validated_video_id(video_id: str) -> str:
    match = VIDEO_ID_PATTERN.fullmatch(video_id)
    if not match:
        raise ValueError("Invalid YouTube video ID")
    return match.group(0)


def _run_yt_dlp_json(video_id: str) -> dict:
    safe_id = _validated_video_id(video_id)
    url = _YOUTUBE_WATCH_URL.format(video_id=safe_id)
    cmd = [
        "yt-dlp",
        "--dump-single-json",
        "--no-warnings",
        "--skip-download",
        "--no-playlist",
        "--",
        url,
    ]
    with youtube_slot():
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError("yt-dlp metadata fetch failed")
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("yt-dlp returned invalid JSON") from exc
    if not data.get("id"):
        raise RuntimeError("Video not found or unavailable")
    return data


def fetch_video_metadata(url: str) -> dict:
    video_id = parse_youtube_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")
    return _run_yt_dlp_json(video_id)


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
