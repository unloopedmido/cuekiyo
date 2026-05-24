from app.enums import ProjectStatus, SongType
from app.models import Project, ProjectAnime, Song
from app.schemas.song import SongSelectItem, SongSelectRequest


def make_song_item(i: int) -> SongSelectItem:
    return SongSelectItem(
        anime_mal_id=1,
        anime_name="Anime",
        song_type=SongType.OPENING,
        song_number=i,
        song_title=f"Song {i}",
        raw_theme_text=f"OP{i}",
    )


def test_create_project_with_unlimited_songs(client):
    res = client.post(
        "/api/projects",
        json={
            "title": "Unlimited MV",
            "animes": [{"anime_mal_id": 1, "anime_name": "Test", "display_order": 0}],
            "unlimited_songs": True,
            "songs_count": 5,
        },
    )
    assert res.status_code == 201
    assert res.json()["unlimited_songs"] is True


def test_select_songs_unlimited_accepts_any_positive_count(db_session):
    from unittest.mock import MagicMock, patch

    from app.api.routes import select_songs

    project = Project(
        title="Free",
        songs_count=5,
        unlimited_songs=True,
        song_types='["opening"]',
        status=ProjectStatus.SONG_SELECTION.value,
    )
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="A", display_order=0)
    )
    db_session.commit()

    songs = [make_song_item(i) for i in range(1, 13)]
    body = SongSelectRequest(songs=songs, confirm_fewer=False)

    with patch(
        "app.api.routes.job_runner.start_job", return_value=MagicMock(id="job-1")
    ) as start_job:
        result = select_songs(project.id, body, db_session)

    assert result == {"jobId": "job-1"}
    start_job.assert_called_once()
    assert db_session.query(Song).filter(Song.project_id == project.id).count() == 12
    db_session.refresh(project)
    assert project.songs_count == 12


def test_select_songs_unlimited_rejects_empty(client, db_session):
    project = Project(title="Free", songs_count=5, unlimited_songs=True)
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="A", display_order=0)
    )
    project.status = ProjectStatus.SONG_SELECTION.value
    db_session.commit()

    res = client.post(
        f"/api/projects/{project.id}/songs/select",
        json={"songs": [], "confirm_fewer": False},
    )
    assert res.status_code == 400
    assert "at least one" in res.json()["detail"].lower()


def test_select_songs_limited_still_requires_count(client, db_session):
    project = Project(title="Fixed", songs_count=5, unlimited_songs=False)
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="A", display_order=0)
    )
    project.status = ProjectStatus.SONG_SELECTION.value
    db_session.commit()

    songs = [make_song_item(i) for i in range(1, 4)]
    res = client.post(
        f"/api/projects/{project.id}/songs/select",
        json={"songs": [s.model_dump(mode="json") for s in songs], "confirm_fewer": False},
    )
    assert res.status_code == 400
    assert "exactly 5" in res.json()["detail"].lower()
