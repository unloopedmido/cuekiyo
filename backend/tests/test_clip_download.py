from pathlib import Path

import pytest
from fastapi import HTTPException

from app.enums import ProjectStatus
from app.models import Project, Song


@pytest.fixture()
def project_with_overlay_file(db_session, tmp_path):
    clip = tmp_path / "overlay.mp4"
    clip.write_bytes(b"fake-overlay-mp4")
    project = Project(
        title="Export Project",
        status=ProjectStatus.COMPLETED.value,
        songs_count=1,
        song_types='["opening"]',
    )
    db_session.add(project)
    db_session.flush()
    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Naruto",
        song_type="opening",
        song_number=1,
        song_title="Blue Bird",
        raw_theme_text="OP1",
        render_order=0,
        overlayed_clip_path=str(clip),
    )
    db_session.add(song)
    db_session.commit()
    return project, song, clip


@pytest.fixture()
def project_with_clean_file(db_session, tmp_path):
    clip = tmp_path / "clean.mp4"
    clip.write_bytes(b"fake-clean-mp4")
    project = Project(
        title="Clean Export",
        status=ProjectStatus.OVERLAYING.value,
        songs_count=1,
        song_types='["opening"]',
    )
    db_session.add(project)
    db_session.flush()
    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Naruto",
        song_type="opening",
        song_number=1,
        song_title="Blue Bird",
        raw_theme_text="OP1",
        render_order=0,
        clean_clip_path=str(clip),
    )
    db_session.add(song)
    db_session.commit()
    return project, song, clip


def test_download_overlay_clip(client, project_with_overlay_file):
    project, song, _path = project_with_overlay_file
    res = client.get(f"/api/projects/{project.id}/songs/{song.id}/clip?variant=overlay")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert res.content == b"fake-overlay-mp4"
    assert "overlay.mp4" in res.headers.get("content-disposition", "")


def test_download_clean_clip(client, project_with_clean_file):
    project, song, _path = project_with_clean_file
    res = client.get(f"/api/projects/{project.id}/songs/{song.id}/clip?variant=clean")
    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert res.content == b"fake-clean-mp4"


def test_download_clip_missing_file(client, db_session, project_with_overlay_file):
    project, song, path = project_with_overlay_file
    path.unlink()
    res = client.get(f"/api/projects/{project.id}/songs/{song.id}/clip?variant=overlay")
    assert res.status_code == 404


def test_download_clip_unknown_song(client, project_with_overlay_file):
    project, _song, _path = project_with_overlay_file
    res = client.get(f"/api/projects/{project.id}/songs/missing/clip?variant=overlay")
    assert res.status_code == 404
