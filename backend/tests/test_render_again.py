from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.enums import JobType, ProjectStatus
from app.models import Project, Song


def _completed_project(db_session, *, overlay_path: str | None = "/tmp/clip.mp4") -> str:
    project = Project(
        title="Done",
        status=ProjectStatus.COMPLETED.value,
        songs_count=1,
        song_types='["opening"]',
        output_path="/tmp/output.mp4",
    )
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
            overlayed_clip_path=overlay_path,
        )
    )
    db_session.commit()
    return project.id


def test_render_again_starts_render_job(db_session, tmp_path):
    from app.api.routes import render_again

    overlay = tmp_path / "clip.mp4"
    overlay.write_bytes(b"clip")
    project_id = _completed_project(db_session, overlay_path=str(overlay))
    mock_job = MagicMock(id="job-1")

    with patch("app.api.routes.job_runner.start_job", return_value=mock_job) as start_job:
        result = render_again(project_id, db_session)

    assert result == {"jobId": "job-1"}
    start_job.assert_called_once_with(project_id, JobType.RENDER)
    project = db_session.get(Project, project_id)
    assert project.status == ProjectStatus.RENDERING.value


def test_render_again_rejects_non_completed(db_session):
    from app.api.routes import render_again

    project = Project(title="Draft", status=ProjectStatus.DRAFT.value)
    db_session.add(project)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        render_again(project.id, db_session)

    assert exc.value.status_code == 400
    assert "completed" in str(exc.value.detail).lower()


def test_render_again_rejects_missing_overlay_clips(db_session, tmp_path):
    from app.api.routes import render_again

    overlay = tmp_path / "missing.mp4"
    project_id = _completed_project(db_session, overlay_path=str(overlay))

    with pytest.raises(HTTPException) as exc:
        render_again(project_id, db_session)

    assert exc.value.status_code == 400
    assert "missing overlay clips" in str(exc.value.detail).lower()
