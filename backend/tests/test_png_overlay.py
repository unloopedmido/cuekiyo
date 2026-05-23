from pathlib import Path

from app.services import ffmpeg_engine
from app.services.overlay_renderer import build_png_overlay_filter


def test_build_png_overlay_cmd():
    clip = Path("/clip.mp4")
    png = Path("/overlay.png")
    out = Path("/out.mp4")
    filt = build_png_overlay_filter()
    cmd = ffmpeg_engine.build_png_overlay_cmd(clip, png, out, "libx264", filt)
    joined = " ".join(cmd)
    assert cmd[0] == "ffmpeg"
    assert "-i" in cmd
    assert str(clip) in cmd
    assert str(png) in cmd
    assert "overlay=0:H-h" in joined
    assert "-map" in cmd
    assert "[v]" in joined
    assert str(out) in cmd
