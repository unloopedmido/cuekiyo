import pytest

from app.enums import ProjectStatus, SourceMode
from app.models import Project, ProjectAnime, Song


@pytest.fixture()
def sample_project(db_session):
    project = Project(
        title="Original MV",
        status=ProjectStatus.COMPLETED.value,
        songs_count=2,
        song_types='["opening", "ending"]',
        clip_time=15.0,
        source_mode=SourceMode.MANUAL.value,
        overlay_config_json='{"style": "minimal"}',
        fade_seconds=1.0,
        unlimited_songs=True,
    )
    db_session.add(project)
    db_session.flush()
    db_session.add_all(
        [
            ProjectAnime(
                project_id=project.id,
                anime_mal_id=1,
                anime_name="Anime A",
                display_order=0,
            ),
            ProjectAnime(
                project_id=project.id,
                anime_mal_id=2,
                anime_name="Anime B",
                display_order=1,
            ),
        ]
    )
    db_session.add(
        Song(
            project_id=project.id,
            anime_mal_id=1,
            anime_name="Anime A",
            song_type="opening",
            song_number=1,
            song_title="OP1",
            raw_theme_text="Artist - OP1",
            render_order=0,
        )
    )
    db_session.commit()
    db_session.refresh(project)
    return project


def test_duplicate_project_creates_draft_copy(client, db_session, sample_project):
    project = sample_project
    res = client.post(f"/api/projects/{project.id}/duplicate")
    assert res.status_code == 201
    body = res.json()
    assert body["id"] != project.id
    assert body["title"].startswith("Copy of")
    assert body["status"] == "DRAFT"
    assert len(body["animes"]) == len(project.animes)
    assert db_session.query(Song).filter(Song.project_id == body["id"]).count() == 0


def test_duplicate_project_copies_settings(client, sample_project):
    project = sample_project
    res = client.post(f"/api/projects/{project.id}/duplicate")
    assert res.status_code == 201
    body = res.json()
    assert body["songs_count"] == project.songs_count
    assert body["song_types"] == ["opening", "ending"]
    assert body["clip_time"] == project.clip_time
    assert body["source_mode"] == project.source_mode
    assert body["overlay_config"] == {"style": "minimal"}


def test_duplicate_project_not_found(client):
    res = client.post("/api/projects/nonexistent-id/duplicate")
    assert res.status_code == 404
