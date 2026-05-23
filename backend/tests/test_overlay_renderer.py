from pathlib import Path
from unittest.mock import patch

import pytest

from app.services import ffmpeg_engine
from app.services.overlay_renderer import (
    OverlayContent,
    build_overlay_content,
    build_png_overlay_filter,
    check_overlay_support,
    render_overlay_png,
)


def test_build_overlay_content():
    content = build_overlay_content("Naruto", "opening", 1, "Rocks", 12345, "Uploader")
    assert content.anime_name == "Naruto"
    assert content.song_line.startswith("OP1:")
    assert "12,345 views" in content.meta_line


def test_build_overlay_content_ending():
    content = build_overlay_content("Naruto", "ending", 2, "Wind", None, None)
    assert content.song_line.startswith("ED2:")
    assert "Views unknown" in content.meta_line
    assert "Unknown uploader" in content.meta_line


def test_build_png_overlay_filter():
    filt = build_png_overlay_filter()
    assert filt.startswith("[0:v][1:v]overlay=")
    assert filt.endswith("[v]")
    assert "format=yuv420p" in filt


def test_render_overlay_png_invokes_node(tmp_path):
    output = tmp_path / "overlay.png"
    content = OverlayContent("Naruto", "OP1: Rocks", "12,345 views · Uploader")

    with patch("app.services.overlay_renderer.subprocess.run") as run:
        run.return_value.returncode = 0
        output.write_bytes(b"png")
        render_overlay_png(content, 1920, 1080, output)

    assert run.call_count == 1
    cmd = run.call_args.args[0]
    assert Path(cmd[0]).name == "node"
    assert cmd[1].endswith("render-overlay.mjs")


def test_render_overlay_png_raises_on_failure(tmp_path):
    content = OverlayContent("Naruto", "OP1: Rocks", "12,345 views · Uploader")

    with patch("app.services.overlay_renderer.subprocess.run") as run:
        run.return_value.returncode = 1
        run.return_value.stderr = "satori failed"
        with pytest.raises(RuntimeError, match="satori failed"):
            render_overlay_png(content, 1920, 1080, tmp_path / "overlay.png")


def test_check_overlay_support():
    with patch("app.services.overlay_renderer._check_ffmpeg_overlay", return_value=(True, "ok")):
        with patch("app.services.overlay_renderer.shutil.which", return_value="/usr/bin/node"):
            with patch(
                "app.services.overlay_renderer.overlay_script_path",
                return_value=Path("/repo/frontend/scripts/render-overlay.mjs"),
            ):
                with patch("pathlib.Path.is_file", return_value=True):
                    with patch("pathlib.Path.is_dir", return_value=True):
                        with patch(
                            "app.services.overlay_renderer.resolve_font",
                            return_value="/fonts/DejaVuSans-Bold.ttf",
                        ):
                            with patch(
                                "app.services.overlay_renderer.resolve_font_regular",
                                return_value="/fonts/DejaVuSans.ttf",
                            ):
                                ok, detail = check_overlay_support()
                                assert ok is True
                                assert "satori" in detail
