import re
import unicodedata
from pathlib import Path

from app.config import settings

_UNSAFE = re.compile(r"[^\w\s.-]", re.UNICODE)
_WHITESPACE = re.compile(r"\s+")


def sanitize_filename(name: str, max_len: int = 120) -> str:
    """Safe single-segment filename (no path separators)."""
    normalized = unicodedata.normalize("NFKD", name)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = _UNSAFE.sub("", ascii_name).strip()
    cleaned = _WHITESPACE.sub("_", cleaned)
    cleaned = cleaned.strip("._") or "untitled"
    return cleaned[:max_len]


def project_dir(project_id: str) -> Path:
    base = settings.projects_dir / project_id
    base.mkdir(parents=True, exist_ok=True)
    return base


def resolve_project_path(project_id: str, *parts: str) -> Path:
    base = project_dir(project_id).resolve()
    target = base.joinpath(*parts).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError("Path traversal detected") from exc
    return target


def song_download_path(project_id: str, song_id: str, ext: str = "mp4") -> Path:
    return resolve_project_path(project_id, "downloads", f"{song_id}.{ext}")


def song_normalized_path(project_id: str, song_id: str) -> Path:
    return resolve_project_path(project_id, "normalized", f"{song_id}.mp4")


def song_clean_clip_path(project_id: str, song_id: str) -> Path:
    return resolve_project_path(project_id, "clips", f"{song_id}_clean.mp4")


def song_overlayed_path(project_id: str, song_id: str) -> Path:
    return resolve_project_path(project_id, "overlayed", f"{song_id}_overlay.mp4")


def overlay_png_path(project_id: str, song_id: str) -> Path:
    return resolve_project_path(project_id, "overlays", f"{song_id}.png")


def final_output_path(project_id: str, title: str) -> Path:
    safe = sanitize_filename(title)
    return resolve_project_path(project_id, "output", f"{safe}_final.mp4")
