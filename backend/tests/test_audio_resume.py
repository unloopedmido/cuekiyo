from pathlib import Path
from unittest.mock import patch

from app.services import ffmpeg_engine


def test_ensure_audio_clip_reuses_existing_valid_helper(tmp_path, monkeypatch):
    clip = tmp_path / "clip.mp4"
    clip.write_bytes(b"video")
    work_dir = tmp_path / "_audio"
    helper = work_dir / "clip_with_audio.mp4"
    work_dir.mkdir()
    helper.write_bytes(b"helper")

    def fake_has_audio(path: Path) -> bool:
        return path == helper

    monkeypatch.setattr(ffmpeg_engine, "has_audio_stream", fake_has_audio)
    monkeypatch.setattr(ffmpeg_engine, "is_valid_media", lambda path: path == helper)

    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        result = ffmpeg_engine.ensure_audio_clip(clip, work_dir)

    run_ffmpeg.assert_not_called()
    assert result == helper
