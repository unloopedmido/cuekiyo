from pathlib import Path
from unittest.mock import patch

import pytest

from app.services import ffmpeg_engine


def test_video_encode_args_libx264_intermediate():
    args = ffmpeg_engine.video_encode_args("libx264", final=False)
    assert "-crf" in args
    assert "-preset" in args
    preset_idx = args.index("-preset")
    assert args[preset_idx + 1] == "medium"


def test_video_encode_args_libx264_final():
    args = ffmpeg_engine.video_encode_args("libx264", final=True)
    preset_idx = args.index("-preset")
    assert args[preset_idx + 1] == "slow"
    crf_idx = args.index("-crf")
    assert int(args[crf_idx + 1]) <= 20


def test_video_encode_args_nvenc_intermediate():
    args = ffmpeg_engine.video_encode_args("h264_nvenc", final=False)
    preset_idx = args.index("-preset")
    assert args[preset_idx + 1] == "p4"
    assert "-rc" in args
    assert "-cq" in args


def test_video_encode_args_nvenc_final():
    args = ffmpeg_engine.video_encode_args("h264_nvenc", final=True)
    preset_idx = args.index("-preset")
    assert args[preset_idx + 1] == "p6"


def test_prepare_clip_cmd_trims_and_normalizes():
    cmd = ffmpeg_engine.build_prepare_clip_cmd(
        Path("/in.mp4"),
        Path("/out.mp4"),
        start=12.5,
        duration=10.0,
        width=1920,
        height=1080,
        fps=24,
        audio_normalize=True,
        video_encoder="libx264",
    )
    joined = " ".join(cmd)
    assert "-ss" in cmd
    assert "12.5" in cmd
    assert "-t" in cmd
    assert "10.0" in cmd
    assert "scale=1920:1080" in joined
    assert "fps=24" in joined
    assert "loudnorm" in joined
    assert "-crf" in cmd


def test_build_render_cmd_single_clip_with_overlay():
    clip = Path("/clip.mp4")
    overlay = "[0:v]null[vout]"
    with patch("app.services.ffmpeg_engine.has_audio_stream", return_value=True):
        cmd = ffmpeg_engine.build_render_cmd([clip], [overlay], Path("/out.mp4"), 0.5, "libx264")
    joined = " ".join(cmd)
    assert "null" in joined
    assert "-map" in cmd
    assert "[vout]" in joined
    preset_idx = cmd.index("-preset")
    assert cmd[preset_idx + 1] == "slow"


def test_build_render_cmd_multi_clip_xfade_and_overlay():
    clips = [Path("/a.mp4"), Path("/b.mp4")]
    overlays = [
        "[0:v]null[v0]",
        "[0:v]null[v1]",
    ]
    meta = {"format": {"duration": "10.0"}}

    with patch("app.services.ffmpeg_engine.has_audio_stream", return_value=True):
        with patch("app.services.ffmpeg_engine.ffprobe_json", return_value=meta):
            cmd = ffmpeg_engine.build_render_cmd(clips, overlays, Path("/out.mp4"), 0.5, "h264_nvenc")

    joined = " ".join(cmd)
    assert "xfade" in joined
    assert "acrossfade" in joined
    assert "null" in joined
    preset_idx = cmd.index("-preset")
    assert cmd[preset_idx + 1] == "p6"


def test_build_render_rejects_video_only(tmp_path):
    clip = tmp_path / "video_only.mp4"
    clip.write_bytes(b"fake")
    overlay = "[0:v]null[vout]"

    with patch("app.services.ffmpeg_engine.has_audio_stream", return_value=False):
        with pytest.raises(RuntimeError, match="missing audio"):
            ffmpeg_engine.build_render_cmd([clip], [overlay], tmp_path / "out.mp4", 0.5, "libx264")
