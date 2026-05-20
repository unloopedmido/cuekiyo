import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.services.paths import resolve_project_path


@dataclass
class OverlayContent:
    anime_name: str
    song_line: str
    meta_line: str


def _truncate(text: str, max_len: int = 72) -> str:
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def _escape_filter_path(path: Path) -> str:
    return str(path).replace("\\", "/").replace(":", "\\:")


def _font_candidates(bold: bool = True) -> list[str]:
    names = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        ]
    )
    return [p for p in names if Path(p).is_file()]


def resolve_font() -> str:
    for path in _font_candidates(bold=True):
        return path
    try:
        proc = subprocess.run(
            ["fc-match", "-f", "%{file}\n", "DejaVu Sans:style=Bold"],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode == 0:
            found = proc.stdout.strip()
            if found and Path(found).is_file():
                return found
    except OSError:
        pass
    for path in _font_candidates(bold=False):
        return path
    raise RuntimeError(
        "No overlay font found. Install dejavu-fontconfig or liberation-fonts."
    )


def build_overlay_content(
    anime_name: str,
    song_type: str,
    song_number: int,
    song_title: str,
    view_count: int | None,
    uploader_name: str | None,
) -> OverlayContent:
    type_label = "OP" if song_type == "opening" else "ED"
    views = f"{view_count:,} views" if view_count is not None else "Views unknown"
    uploader = uploader_name or "Unknown uploader"
    return OverlayContent(
        anime_name=_truncate(anime_name, 56),
        song_line=_truncate(f"{type_label}{song_number}: {song_title}", 64),
        meta_line=_truncate(f"{views} · {uploader}", 72),
    )


def write_overlay_text_files(project_id: str, song_id: str, content: OverlayContent) -> dict[str, Path]:
    base = resolve_project_path(project_id, "overlays", song_id)
    base.parent.mkdir(parents=True, exist_ok=True)
    paths = {
        "anime": base.with_name(f"{song_id}_anime.txt"),
        "song": base.with_name(f"{song_id}_song.txt"),
        "meta": base.with_name(f"{song_id}_meta.txt"),
    }
    paths["anime"].write_text(content.anime_name, encoding="utf-8")
    paths["song"].write_text(content.song_line, encoding="utf-8")
    paths["meta"].write_text(content.meta_line, encoding="utf-8")
    return paths


def build_drawtext_filter(
    text_files: dict[str, Path],
    width: int,
    height: int,
    font_path: str,
) -> str:
    """Return filter_complex video chain ending in [v]."""
    font = font_path.replace("\\", "/").replace(":", "\\:")
    margin_x = 48
    box_height = 160
    box_y = height - box_height - 48
    text_x = margin_x + 28
    anime_y = box_y + 28
    song_y = box_y + 68
    meta_y = box_y + 108
    box_width = max(width - (margin_x * 2), 320)

    anime_file = _escape_filter_path(text_files["anime"])
    song_file = _escape_filter_path(text_files["song"])
    meta_file = _escape_filter_path(text_files["meta"])

    return (
        f"[0:v]drawbox=x={margin_x}:y={box_y}:w={box_width}:h={box_height}:"
        f"color=black@0.55:t=fill,"
        f"drawtext=fontfile='{font}':textfile='{anime_file}':x={text_x}:y={anime_y}:"
        f"fontsize=28:fontcolor=white,"
        f"drawtext=fontfile='{font}':textfile='{song_file}':x={text_x}:y={song_y}:"
        f"fontsize=22:fontcolor=white,"
        f"drawtext=fontfile='{font}':textfile='{meta_file}':x={text_x}:y={meta_y}:"
        f"fontsize=16:fontcolor=white@0.85[v]"
    )


def check_overlay_support() -> tuple[bool, str]:
    ok, detail = _check_ffmpeg_drawtext()
    if not ok:
        return False, detail
    try:
        return True, resolve_font()
    except RuntimeError as exc:
        return False, str(exc)


def _check_ffmpeg_drawtext() -> tuple[bool, str]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-filters"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return False, "ffmpeg not available"
    if " drawtext " not in proc.stdout:
        return False, "ffmpeg missing drawtext filter"
    return True, "ffmpeg drawtext available"
