from pathlib import Path
from unittest.mock import patch

import pytest

from app.services import youtube_sourcer


def test_yt_dlp_download_failure_cleans_artifacts(tmp_path):
    output = tmp_path / "clip.mp4"
    (tmp_path / "clip.mp4.part").write_text("partial", encoding="utf-8")
    (tmp_path / "clip.f248.webm.part").write_text("frag", encoding="utf-8")

    with patch.object(
        youtube_sourcer,
        "_run_subprocess",
        return_value=type("Proc", (), {"returncode": 1, "stderr": "", "stdout": ""})(),
    ):
        with pytest.raises(RuntimeError, match="yt-dlp download failed"):
            youtube_sourcer.yt_dlp_download("https://example.com", str(output))

    assert not any(tmp_path.iterdir())


def test_yt_dlp_download_success_requires_output_file(tmp_path):
    output = tmp_path / "clip.mp4"

    with patch.object(
        youtube_sourcer,
        "_run_subprocess",
        return_value=type("Proc", (), {"returncode": 0, "stderr": "", "stdout": ""})(),
    ):
        with pytest.raises(RuntimeError, match="output missing"):
            youtube_sourcer.yt_dlp_download("https://example.com", str(output))


def test_yt_dlp_download_success_with_output(tmp_path):
    output = tmp_path / "clip.mp4"
    output.write_bytes(b"video")

    with patch.object(
        youtube_sourcer,
        "_run_subprocess",
        return_value=type("Proc", (), {"returncode": 0, "stderr": "", "stdout": ""})(),
    ):
        youtube_sourcer.yt_dlp_download("https://example.com", str(output))

    assert output.exists()


def test_source_candidates_deduplicates_search_queries(monkeypatch):
    from app.services import youtube_sourcer

    calls = []

    def fake_build_queries(anime_name, song_title, song_type, song_number, artist):
        return [
            "Anime Song opening",
            "Anime Song opening",
            " Anime   Song   opening ",
        ]

    def fake_search(query, max_results=10):
        calls.append(query)
        return [
            {
                "id": f"id-{len(calls)}",
                "webpage_url": f"https://youtu.be/id-{len(calls)}",
                "title": "Anime Song Opening",
                "duration": 89,
                "view_count": 1000,
            }
        ]

    monkeypatch.setattr(youtube_sourcer, "build_search_queries", fake_build_queries)
    monkeypatch.setattr(youtube_sourcer, "yt_dlp_search", fake_search)

    results = youtube_sourcer.source_candidates_for_song(
        "Anime",
        "Song",
        "opening",
        1,
        None,
        top_n=3,
    )

    assert len(calls) == 1
    assert calls == ["Anime Song opening"]
    assert len(results) == 1
