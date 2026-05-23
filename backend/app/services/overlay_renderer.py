import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.services.paths import overlay_png_path, resolve_project_path


@dataclass
class OverlayContent:
    anime_name: str
    song_line: str
    meta_line: str


_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_OVERLAY_SCRIPT = _REPO_ROOT / "frontend" / "scripts" / "render-overlay.mjs"


def _truncate(text: str, max_len: int = 72) -> str:
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


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
            "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
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


def resolve_font_regular() -> str:
    for path in _font_candidates(bold=False):
        return path
    try:
        proc = subprocess.run(
            ["fc-match", "-f", "%{file}\n", "DejaVu Sans"],
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
    return resolve_font()


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


def overlay_script_path() -> Path:
    return _OVERLAY_SCRIPT


def render_overlay_png(
    content: OverlayContent,
    width: int,
    height: int,
    output_path: Path,
) -> None:
    """Render lower-third PNG via the frontend Satori CLI."""
    script = overlay_script_path()
    if not script.is_file():
        raise RuntimeError(f"Overlay renderer script missing: {script}")

    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for overlay rendering")

    payload = {
        "width": width,
        "height": height,
        "animeName": content.anime_name,
        "songLine": content.song_line,
        "metaLine": content.meta_line,
        "fontBold": resolve_font(),
        "fontRegular": resolve_font_regular(),
        "output": str(output_path),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tmp:
        json.dump(payload, tmp)
        payload_path = tmp.name

    try:
        proc = subprocess.run(
            [node, str(script), payload_path],
            capture_output=True,
            text=True,
            check=False,
            cwd=str(_REPO_ROOT / "frontend"),
        )
    finally:
        Path(payload_path).unlink(missing_ok=True)

    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "overlay render failed").strip()
        raise RuntimeError(detail)

    if not output_path.is_file() or output_path.stat().st_size == 0:
        raise RuntimeError(f"Overlay PNG was not written: {output_path}")


def write_overlay_png(project_id: str, song_id: str, content: OverlayContent, width: int, height: int) -> Path:
    png_path = overlay_png_path(project_id, song_id)
    render_overlay_png(content, width, height, png_path)
    return png_path


def overlay_text_file_paths(project_id: str, song_id: str) -> dict[str, Path]:
    """Legacy text artifact paths kept for project data compatibility."""
    base = resolve_project_path(project_id, "overlays", song_id)
    return {
        "anime": base.with_name(f"{song_id}_anime.txt"),
        "song": base.with_name(f"{song_id}_song.txt"),
        "meta": base.with_name(f"{song_id}_meta.txt"),
    }


def write_overlay_text_files(project_id: str, song_id: str, content: OverlayContent) -> dict[str, Path]:
    paths = overlay_text_file_paths(project_id, song_id)
    paths["anime"].parent.mkdir(parents=True, exist_ok=True)
    paths["anime"].write_text(content.anime_name, encoding="utf-8")
    paths["song"].write_text(content.song_line, encoding="utf-8")
    paths["meta"].write_text(content.meta_line, encoding="utf-8")
    return paths


def build_png_overlay_filter() -> str:
    """Composite RGBA PNG strip along the bottom of the video."""
    return "[0:v][1:v]overlay=0:H-h:format=auto,format=yuv420p[v]"


def check_overlay_support() -> tuple[bool, str]:
    ok, detail = _check_ffmpeg_overlay()
    if not ok:
        return False, detail

    node = shutil.which("node")
    if not node:
        return False, "node not available"

    script = overlay_script_path()
    if not script.is_file():
        return False, f"Missing overlay script: {script.name}"

    satori_pkg = _REPO_ROOT / "frontend" / "node_modules" / "satori"
    resvg_pkg = _REPO_ROOT / "frontend" / "node_modules" / "@resvg" / "resvg-js"
    if not satori_pkg.is_dir() or not resvg_pkg.is_dir():
        return False, "Run npm ci in frontend/ for overlay dependencies"

    try:
        fonts = f"{resolve_font()}, {resolve_font_regular()}"
    except RuntimeError as exc:
        return False, str(exc)

    return True, f"node + satori overlay ({fonts})"


def _check_ffmpeg_overlay() -> tuple[bool, str]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-filters"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return False, "ffmpeg not available"
    if " overlay " not in proc.stdout:
        return False, "ffmpeg missing overlay filter"
    return True, "ffmpeg overlay available"
