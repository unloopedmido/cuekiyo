import json
import math
import re
import subprocess
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from app.exceptions import CancelledJob

REJECT_KEYWORDS = [
    "remix",
    "cover",
    "nightcore",
    "slowed",
    "reverb",
    "live",
    "piano",
    "instrumental",
    "reaction",
    "amv",
    "edit",
    "1 hour",
    "extended",
    "loop",
    "lyrics",
    "karaoke",
    "shorts",
    "#shorts",
]

SHORTS_MAX_DURATION = 60.0
IDEAL_MIN_DURATION = 60.0
IDEAL_MAX_DURATION = 120.0


@dataclass
class CandidateResult:
    youtube_id: str
    url: str
    title: str
    uploader_name: str | None = None
    view_count: int | None = None
    duration: float | None = None
    thumbnail_url: str | None = None
    score: float = 0.0
    rejection_flags: list[str] = field(default_factory=list)
    raw_metadata: dict = field(default_factory=dict)


def _normalize(text: str) -> str:
    return re.sub(r"[^\w\s]", " ", text.lower()).strip()


def _token_overlap(a: str, b: str) -> float:
    ta = set(_normalize(a).split())
    tb = set(_normalize(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def build_search_queries(
    anime_name: str,
    song_title: str,
    song_type: str,
    song_number: int,
    artist: str | None,
) -> list[str]:
    op_ed = "OP" if song_type == "opening" else "ED"
    type_word = "opening" if song_type == "opening" else "ending"
    base = [
        f"{anime_name} {song_title} {type_word}",
        f"{anime_name} {op_ed}{song_number} {song_title}",
    ]
    if artist:
        base.append(f"{anime_name} {song_title} {artist}")
        base.append(f"{anime_name} {op_ed}{song_number} {artist}")
    return base


def _dedupe_queries(queries: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for query in queries:
        display = " ".join(query.split())
        key = display.casefold()
        if not display or key in seen:
            continue
        seen.add(key)
        deduped.append(display)
    return deduped


def score_candidate(
    entry: dict,
    anime_name: str,
    song_title: str,
    artist: str | None,
    song_type: str,
) -> CandidateResult:
    title = entry.get("title") or ""
    title_lower = title.lower()
    flags: list[str] = []
    penalty = 0.0

    for kw in REJECT_KEYWORDS:
        if kw in title_lower:
            flags.append(kw)
            penalty += 15.0

    duration = entry.get("duration")
    if duration is not None:
        if duration <= SHORTS_MAX_DURATION:
            flags.append("shorts_duration")
            penalty += 20.0
        elif IDEAL_MIN_DURATION <= duration <= IDEAL_MAX_DURATION:
            penalty -= 5.0
        elif duration > 180:
            penalty += 8.0

    views = entry.get("view_count") or 0
    view_score = math.log10(max(views, 1)) * 2.0

    title_sim = _token_overlap(title, song_title) * 25.0
    anime_sim = _token_overlap(title, anime_name) * 20.0
    artist_sim = _token_overlap(title, artist or "") * 15.0 if artist else 0.0
    type_bonus = 5.0 if ("opening" in title_lower and song_type == "opening") or (
        "ending" in title_lower and song_type == "ending"
    ) else 0.0

    score = title_sim + anime_sim + artist_sim + view_score + type_bonus - penalty

    return CandidateResult(
        youtube_id=entry.get("id") or "",
        url=entry.get("webpage_url") or entry.get("url") or "",
        title=title,
        uploader_name=entry.get("uploader") or entry.get("channel"),
        view_count=views if views else None,
        duration=float(duration) if duration is not None else None,
        thumbnail_url=entry.get("thumbnail"),
        score=score,
        rejection_flags=flags,
        raw_metadata=entry,
    )


def _run_subprocess(
    cmd: list[str],
    *,
    cancel_check: Callable[[], bool] | None = None,
) -> subprocess.CompletedProcess[str]:
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    while proc.poll() is None:
        if cancel_check and cancel_check():
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
            raise CancelledJob()
        time.sleep(0.25)
    stdout, stderr = proc.communicate()
    return subprocess.CompletedProcess(cmd, proc.returncode, stdout, stderr)


def yt_dlp_search(query: str, max_results: int = 10) -> list[dict]:
    cmd = [
        "yt-dlp",
        f"ytsearch{max_results}:{query}",
        "--dump-single-json",
        "--flat-playlist",
        "--no-warnings",
        "--skip-download",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        return []
    try:
        data = json.loads(proc.stdout)
        return data.get("entries") or []
    except json.JSONDecodeError:
        return []


def source_candidates_for_song(
    anime_name: str,
    song_title: str,
    song_type: str,
    song_number: int,
    artist: str | None,
    top_n: int = 3,
) -> list[CandidateResult]:
    seen_ids: set[str] = set()
    scored: list[CandidateResult] = []

    for query in _dedupe_queries(build_search_queries(anime_name, song_title, song_type, song_number, artist)):
        for entry in yt_dlp_search(query, max_results=10):
            vid = entry.get("id")
            if not vid or vid in seen_ids:
                continue
            seen_ids.add(vid)
            result = score_candidate(entry, anime_name, song_title, artist, song_type)
            if result.youtube_id:
                scored.append(result)

    scored.sort(key=lambda c: c.score, reverse=True)
    clean = [c for c in scored if not c.rejection_flags]
    pool = clean if len(clean) >= top_n else scored
    return pool[:top_n]


def cleanup_download_artifacts(output_path: str | Path) -> None:
    """Remove a song download and any yt-dlp fragments left behind."""
    out = Path(output_path)
    if not out.parent.exists():
        return
    for path in out.parent.glob(f"{out.stem}*"):
        if path.is_file():
            path.unlink(missing_ok=True)


def yt_dlp_download(
    url: str,
    output_path: str,
    *,
    cancel_check: Callable[[], bool] | None = None,
) -> None:
    output_path = str(output_path)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "yt-dlp",
        url,
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format",
        "mp4",
        "-o",
        output_path,
        "--no-playlist",
        "--no-warnings",
    ]
    proc = _run_subprocess(cmd, cancel_check=cancel_check)
    if proc.returncode != 0:
        cleanup_download_artifacts(out)
        raise RuntimeError(proc.stderr or proc.stdout or "yt-dlp download failed")
    if not out.is_file() or out.stat().st_size == 0:
        cleanup_download_artifacts(out)
        raise RuntimeError(f"Download finished but output missing: {output_path}")


def fetch_heatmap(url: str) -> list[tuple[float, float]] | None:
    """Return list of (timestamp, value) from yt-dlp heatmap if available."""
    cmd = ["yt-dlp", "--dump-json", "--skip-download", url]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        return None
    try:
        data = json.loads(proc.stdout.splitlines()[-1] if proc.stdout else "{}")
    except (json.JSONDecodeError, IndexError):
        return None
    heatmap = data.get("heatmap") or data.get("heat_map")
    if not heatmap:
        return None
    points: list[tuple[float, float]] = []
    for pt in heatmap:
        if isinstance(pt, dict):
            points.append((float(pt.get("start_time", pt.get("time", 0))), float(pt.get("value", 0))))
        elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
            points.append((float(pt[0]), float(pt[1])))
    return points if points else None
