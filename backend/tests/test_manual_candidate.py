from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.enums import ProjectStatus, SongType, SourceMode, SongStatus
from app.models import Project, ProjectAnime, Song, SongCandidate
from app.schemas.song import ManualCandidateRequest, SongSelectItem, SongSelectRequest
from app.services.youtube_sourcer import CandidateResult


def _fake_candidate(*, duration: float = 120.0) -> CandidateResult:
    return CandidateResult(
        youtube_id="abc12345678",
        url="https://www.youtube.com/watch?v=abc12345678",
        title="My Upload",
        uploader_name="Me",
        view_count=100,
        duration=duration,
        thumbnail_url="https://i.ytimg.com/vi/abc12345678/mqdefault.jpg",
        score=1.0,
        raw_metadata={"id": "abc12345678"},
    )


def test_select_songs_manual_mode_skips_sourcing(db_session):
    from app.api.routes import select_songs

    project = Project(
        title="Manual Project",
        status=ProjectStatus.SONG_SELECTION.value,
        source_mode=SourceMode.MANUAL.value,
        songs_count=1,
        song_types='["opening"]',
        clip_time=10.0,
    )
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="Anime", display_order=0)
    )
    db_session.commit()

    body = SongSelectRequest(
        songs=[
            SongSelectItem(
                anime_mal_id=1,
                anime_name="Anime",
                song_type=SongType.OPENING,
                song_number=1,
                song_title="Song",
                raw_theme_text="OP1",
            )
        ]
    )

    with patch("app.api.routes.job_runner.start_job") as start_job:
        result = select_songs(project.id, body, db_session)

    assert result == {"ok": True}
    start_job.assert_not_called()
    db_session.refresh(project)
    assert project.status == ProjectStatus.AWAITING_CANDIDATES.value


def test_submit_manual_candidate_creates_single_selected_candidate(
    db_session, project_with_manual_song
):
    from app.api.routes import submit_manual_candidate

    project, song = project_with_manual_song
    fake = _fake_candidate()

    with patch("app.api.routes.fetch_video_metadata", return_value=fake.raw_metadata):
        with patch("app.api.routes.metadata_to_candidate_result", return_value=fake):
            with patch("app.api.routes.job_runner.start_job", return_value=MagicMock(id="job-1")):
                result = submit_manual_candidate(
                    project.id,
                    song.id,
                    ManualCandidateRequest(url="https://youtu.be/abc12345678"),
                    db_session,
                )

    assert result["ok"] is True
    assert result["candidate"]["youtube_id"] == "abc12345678"
    assert result["candidate"]["is_manual"] is True
    db_session.refresh(song)
    assert song.selected_candidate_id == result["candidate"]["id"]
    assert song.status == SongStatus.SELECTED.value

    candidates = db_session.query(SongCandidate).filter(SongCandidate.song_id == song.id).all()
    assert len(candidates) == 1
    assert candidates[0].is_manual is True
    assert candidates[0].rank == 1
    assert candidates[0].is_selected is True


def test_submit_manual_candidate_rejects_short_duration(db_session, project_with_manual_song):
    from app.api.routes import submit_manual_candidate

    project, song = project_with_manual_song
    project.clip_time = 30.0
    db_session.commit()
    fake = _fake_candidate(duration=15.0)

    with patch("app.api.routes.fetch_video_metadata", return_value=fake.raw_metadata):
        with patch("app.api.routes.metadata_to_candidate_result", return_value=fake):
            with pytest.raises(HTTPException) as exc:
                submit_manual_candidate(
                    project.id,
                    song.id,
                    ManualCandidateRequest(url="https://youtu.be/abc12345678"),
                    db_session,
                )

    assert exc.value.status_code == 400
    assert "15s" in str(exc.value.detail)
    assert "30s" in str(exc.value.detail)


def test_submit_manual_candidate_rejects_auto_source_mode(db_session, project_with_manual_song):
    from app.api.routes import submit_manual_candidate

    project, song = project_with_manual_song
    project.source_mode = SourceMode.AUTO.value
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        submit_manual_candidate(
            project.id,
            song.id,
            ManualCandidateRequest(url="https://youtu.be/abc12345678"),
            db_session,
        )

    assert exc.value.status_code == 400
    assert "manual source mode" in str(exc.value.detail).lower()


def test_submit_manual_candidate_rejects_wrong_status(db_session, project_with_manual_song):
    from app.api.routes import submit_manual_candidate

    project, song = project_with_manual_song
    project.status = ProjectStatus.SONG_SELECTION.value
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        submit_manual_candidate(
            project.id,
            song.id,
            ManualCandidateRequest(url="https://youtu.be/abc12345678"),
            db_session,
        )

    assert exc.value.status_code == 400
    assert "reviewing clips" in str(exc.value.detail).lower()


def test_submit_manual_candidate_starts_download_when_all_songs_selected(
    db_session, project_with_manual_song
):
    from app.api.routes import submit_manual_candidate

    project, song = project_with_manual_song
    fake = _fake_candidate()

    with patch("app.api.routes.fetch_video_metadata", return_value=fake.raw_metadata):
        with patch("app.api.routes.metadata_to_candidate_result", return_value=fake):
            with patch("app.api.routes.job_runner.start_job") as start_job:
                result = submit_manual_candidate(
                    project.id,
                    song.id,
                    ManualCandidateRequest(url="https://youtu.be/abc12345678"),
                    db_session,
                )

    assert result["ok"] is True
    assert result["jobId"] is None
    start_job.assert_not_called()
    db_session.refresh(project)
    assert project.status == ProjectStatus.AWAITING_CLIP_TRIM.value


def test_submit_manual_candidate_replaces_existing_candidates(db_session, project_with_manual_song):
    from app.api.routes import submit_manual_candidate

    project, song = project_with_manual_song
    db_session.add(
        SongCandidate(
            song_id=song.id,
            youtube_id="oldvideo111",
            url="https://www.youtube.com/watch?v=oldvideo111",
            title="Old",
            rank=1,
        )
    )
    db_session.commit()
    fake = _fake_candidate()

    with patch("app.api.routes.fetch_video_metadata", return_value=fake.raw_metadata):
        with patch("app.api.routes.metadata_to_candidate_result", return_value=fake):
            with patch("app.api.routes.job_runner.start_job", return_value=MagicMock(id="job-1")):
                submit_manual_candidate(
                    project.id,
                    song.id,
                    ManualCandidateRequest(url="https://youtu.be/abc12345678"),
                    db_session,
                )

    candidates = db_session.query(SongCandidate).filter(SongCandidate.song_id == song.id).all()
    assert len(candidates) == 1
    assert candidates[0].youtube_id == "abc12345678"
