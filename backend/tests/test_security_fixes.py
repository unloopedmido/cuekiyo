from unittest.mock import patch

import pytest

from app.main import _safe_frontend_path
from app.services.paths import resolve_under_base
from app.services.youtube_url import _run_yt_dlp_json, parse_youtube_id


def test_parse_youtube_id_rejects_redos_style_input():
    evil = "https://www.youtube.com/watch?" + "a" * 5000 + "v=dQw4w9WgXcQ"
    assert parse_youtube_id(evil) == "dQw4w9WgXcQ"


def test_run_yt_dlp_json_uses_validated_video_id():
    payload = {"id": "abc12345678", "title": "Test"}
    with patch("app.services.youtube_url.subprocess.run") as run:
        run.return_value.returncode = 0
        run.return_value.stdout = '{"id": "abc12345678", "title": "Test"}'
        result = _run_yt_dlp_json("abc12345678")
    assert result == payload
    cmd = run.call_args.args[0]
    assert cmd[-1] == "https://www.youtube.com/watch?v=abc12345678"
    assert cmd[-2] == "--"


def test_run_yt_dlp_json_rejects_invalid_id():
    with pytest.raises(ValueError, match="Invalid YouTube video ID"):
        _run_yt_dlp_json("not-a-valid-id")


@pytest.mark.parametrize(
    "full_path",
    [
        "../etc/passwd",
        "../../backend/app/config.py",
        "/etc/passwd",
        "assets/../../etc/passwd",
    ],
)
def test_safe_frontend_path_blocks_traversal(full_path: str):
    assert _safe_frontend_path(full_path) is None


def test_safe_frontend_path_allows_existing_file(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    dist.mkdir()
    asset = dist / "logo.svg"
    asset.write_text("<svg/>", encoding="utf-8")
    monkeypatch.setattr("app.main._FRONTEND_DIST", dist)

    resolved = _safe_frontend_path("logo.svg")
    assert resolved == asset.resolve()


@pytest.mark.parametrize(
    "relative",
    [
        "../etc/passwd",
        "../../backend/app/config.py",
        "/etc/passwd",
        "assets/../../etc/passwd",
        "bad segment/file.txt",
        "file;.txt",
    ],
)
def test_resolve_under_base_blocks_traversal(tmp_path, relative: str):
    base = tmp_path / "dist"
    base.mkdir()
    assert resolve_under_base(base, relative) is None
