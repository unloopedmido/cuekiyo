from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.enums import ProjectStatus, SongStatus
from app.exceptions import CancelledJob, PrerequisiteError
from app.state_machine import validate_user_gate_prerequisites


class _Song:
    def __init__(self, song_title: str, selected_candidate_id: str | None = None, render_order: int = 0):
        self.song_title = song_title
        self.selected_candidate_id = selected_candidate_id
        self.render_order = render_order


def test_awaiting_candidates_requires_all_selections():
    songs = [_Song("A", "c1"), _Song("B", None)]
    with pytest.raises(PrerequisiteError, match="Every song must have a selected candidate"):
        validate_user_gate_prerequisites(ProjectStatus.AWAITING_CANDIDATES, songs)


def test_awaiting_render_order_requires_unique_order():
    songs = [_Song("A", render_order=0), _Song("B", render_order=0)]
    with pytest.raises(PrerequisiteError, match="Render order must be unique"):
        validate_user_gate_prerequisites(ProjectStatus.AWAITING_RENDER_ORDER, songs)


def test_stage_start_blocks_incomplete_candidates(db_session):
    from app.api.routes import start_next_stage
    from app.models import Project, ProjectAnime, Song

    project = Project(
        title="Test",
        status=ProjectStatus.AWAITING_CANDIDATES.value,
        songs_count=2,
        song_types='["opening"]',
    )
    db_session.add(project)
    db_session.flush()
    db_session.add(ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="Anime A", display_order=0))
    db_session.add(
        Song(
            project_id=project.id,
            anime_mal_id=1,
            anime_name="Anime A",
            song_type="opening",
            song_number=1,
            song_title="Song A",
            raw_theme_text="OP1",
            render_order=0,
            selected_candidate_id="cand-1",
        )
    )
    db_session.add(
        Song(
            project_id=project.id,
            anime_mal_id=1,
            anime_name="Anime A",
            song_type="opening",
            song_number=2,
            song_title="Song B",
            raw_theme_text="OP2",
            render_order=1,
        )
    )
    db_session.commit()

    with patch("app.api.routes.job_runner.start_job") as start_job:
        with pytest.raises(HTTPException) as exc:
            start_next_stage(project.id, db_session)
        start_job.assert_not_called()

    assert exc.value.status_code == 400
    assert "selected candidate" in str(exc.value.detail).lower()


def test_stage_start_blocks_invalid_render_order_without_starting_job(db_session):
    from app.api.routes import start_next_stage
    from app.models import Project, Song

    project = Project(
        title="Render Gate",
        status=ProjectStatus.AWAITING_RENDER_ORDER.value,
        songs_count=2,
        song_types='["opening"]',
    )
    db_session.add(project)
    db_session.flush()
    songs = []
    for i, title in enumerate(("Song A", "Song B")):
        song = Song(
            project_id=project.id,
            anime_mal_id=1,
            anime_name="Anime A",
            song_type="opening",
            song_number=1,
            song_title=title,
            raw_theme_text="OP1",
            render_order=i,
            selected_candidate_id="candidate-id",
        )
        db_session.add(song)
        songs.append(song)
    db_session.commit()
    for song in songs:
        song.render_order = 0

    with db_session.no_autoflush:
        with patch("app.api.routes.job_runner.start_job") as start_job:
            with pytest.raises(HTTPException) as exc:
                start_next_stage(project.id, db_session)
            start_job.assert_not_called()

    assert exc.value.status_code == 400
    assert "render order" in str(exc.value.detail).lower()


def test_run_download_requires_all_candidates(db_session):
    from app.jobs.runner import JobRunner
    from app.models import Job, Project, Song

    project = Project(title="Test", status=ProjectStatus.DOWNLOADING.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Anime",
        song_type="opening",
        song_number=1,
        song_title="Song",
        raw_theme_text="OP1",
        render_order=0,
    )
    db_session.add(song)
    db_session.commit()
    job = Job(project_id=project.id, type="download", status="running")
    db_session.add(job)
    db_session.commit()

    runner = JobRunner()
    with pytest.raises(PrerequisiteError):
        runner._run_download(db_session, job, project)


def test_cancelled_job_not_failed(db_session):
    from unittest.mock import patch

    from app.jobs.runner import JobRunner
    from app.models import Job, Project

    project = Project(title="Test", status=ProjectStatus.DOWNLOADING.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    job = Job(project_id=project.id, type="download", status="running")
    db_session.add(job)
    db_session.commit()

    runner = JobRunner()
    runner._cancel_flags[job.id] = True

    def session_factory():
        return db_session

    job_id = job.id
    project_id = project.id

    with patch("app.jobs.runner.SessionLocal", side_effect=session_factory):
        with patch.object(runner, "_run_download", side_effect=CancelledJob()):
            runner._run_job_thread(job_id)

    job = db_session.get(Job, job_id)
    project = db_session.get(Project, project_id)
    assert job is not None
    assert project is not None
    assert job.status == "cancelled"
    assert project.status == ProjectStatus.CANCELLED.value


def test_recover_stale_pipeline_jobs(db_session):
    from datetime import datetime, timedelta, timezone
    from unittest.mock import patch

    from app.jobs.runner import recover_stale_pipeline_jobs
    from app.models import AppLock, Job, Project

    project = Project(title="Stale", status=ProjectStatus.DOWNLOADING.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    job = Job(project_id=project.id, type="download", status="running")
    db_session.add(job)
    db_session.flush()
    lock = AppLock(
        id="global_pipeline",
        running_project_id=project.id,
        running_job_id=job.id,
        last_heartbeat_at=datetime.now(timezone.utc) - timedelta(seconds=9999),
    )
    db_session.merge(lock)
    db_session.commit()

    with patch.object(db_session, "close"), patch(
        "app.jobs.runner.SessionLocal", side_effect=lambda: db_session
    ):
        assert recover_stale_pipeline_jobs() == 1
    db_session.expire_all()
    job = db_session.get(Job, job.id)
    project = db_session.get(Project, project.id)
    lock = db_session.get(AppLock, "global_pipeline")
    assert job.status == "failed"
    assert project.status == ProjectStatus.FAILED.value
    assert lock.running_job_id is None


def test_failed_job_releases_pipeline_lock(db_session):
    from unittest.mock import patch

    from app.jobs.runner import JobRunner
    from app.models import AppLock, Job, Project

    project = Project(title="Fail", status=ProjectStatus.DOWNLOADING.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    job = Job(project_id=project.id, type="download", status="queued")
    db_session.add(job)
    db_session.commit()

    runner = JobRunner()
    job_id = job.id
    project_id = project.id

    with patch("app.jobs.runner.SessionLocal", side_effect=lambda: db_session):
        with patch.object(runner, "_run_download", side_effect=RuntimeError("boom")):
            runner._run_job_thread(job_id)

    db_session.expire_all()
    lock = db_session.get(AppLock, "global_pipeline")
    job = db_session.get(Job, job_id)
    project = db_session.get(Project, project_id)

    assert lock.running_job_id is None
    assert lock.running_project_id is None
    assert job.status == "failed"
    assert project.status == ProjectStatus.FAILED.value
    assert "boom" in job.error_message


def test_stale_lock_not_stolen_while_heartbeating(db_session):
    from datetime import datetime, timedelta, timezone

    from app.jobs.runner import _acquire_lock, _heartbeat, _release_lock
    from app.models import Job, Project

    project_a = Project(title="A", status=ProjectStatus.DOWNLOADING.value)
    project_b = Project(title="B", status=ProjectStatus.DOWNLOADING.value)
    db_session.add_all([project_a, project_b])
    db_session.flush()
    job_a = Job(project_id=project_a.id, type="download", status="running")
    job_b = Job(project_id=project_b.id, type="download", status="queued")
    db_session.add_all([job_a, job_b])
    db_session.commit()

    assert _acquire_lock(db_session, project_a.id, job_a.id) is True
    _heartbeat(db_session)
    assert _acquire_lock(db_session, project_b.id, job_b.id) is False

    lock = db_session.get(__import__("app.models", fromlist=["AppLock"]).AppLock, "global_pipeline")
    lock.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=9999)
    db_session.commit()
    _release_lock(db_session)
    assert _acquire_lock(db_session, project_b.id, job_b.id) is True


def test_render_fails_on_missing_overlay(db_session):
    from app.jobs.runner import JobRunner
    from app.models import Job, Project, Song

    project = Project(title="Test", status=ProjectStatus.RENDERING.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    db_session.add(
        Song(
            project_id=project.id,
            anime_mal_id=1,
            anime_name="Anime",
            song_type="opening",
            song_number=1,
            song_title="Song",
            raw_theme_text="OP1",
            render_order=0,
        )
    )
    db_session.commit()
    job = Job(project_id=project.id, type="render", status="running")
    db_session.add(job)
    db_session.commit()

    runner = JobRunner()
    with pytest.raises(RuntimeError, match="Missing overlay clips"):
        runner._run_render(db_session, job, project)
