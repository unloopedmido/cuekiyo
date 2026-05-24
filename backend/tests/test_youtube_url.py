from unittest.mock import patch

import pytest

from app.services.youtube_url import (
    fetch_video_metadata,
    metadata_to_candidate_result,
    normalize_youtube_url,
    parse_youtube_id,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ?t=30", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://example.com/not-youtube", None),
        ("", None),
    ],
)
def test_parse_youtube_id(raw, expected):
    assert parse_youtube_id(raw) == expected


def test_normalize_youtube_url():
    assert normalize_youtube_url("https://youtu.be/abc12345678") == "https://www.youtube.com/watch?v=abc12345678"


def test_fetch_video_metadata_parses_yt_dlp_json():
    payload = {
        "id": "abc12345678",
        "webpage_url": "https://www.youtube.com/watch?v=abc12345678",
        "title": "Anime OP1 Official",
        "uploader": "Aniplex",
        "view_count": 50000,
        "duration": 89.0,
        "thumbnail": "https://i.ytimg.com/vi/abc12345678/hqdefault.jpg",
    }
    with patch("app.services.youtube_url._run_yt_dlp_json", return_value=payload):
        entry = fetch_video_metadata("https://youtu.be/abc12345678")
    assert entry["id"] == "abc12345678"
    result = metadata_to_candidate_result(entry)
    assert result.youtube_id == "abc12345678"
    assert result.title == "Anime OP1 Official"
    assert result.view_count == 50000
