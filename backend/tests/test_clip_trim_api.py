from unittest.mock import MagicMock, patch

from app.enums import JobType, ProjectStatus, SongStatus
from app.models import Project, ProjectAnime, Song, SongCandidate


def test_update_song_clip_trim(client, db_session, project_with_selected_songs):
    project, song = project_with_selected_songs
    project.status = ProjectStatus.AWAITING_CLIP_TRIM.value
    db_session.commit()
    res = client.patch(
        f"/api/projects/{project.id}/songs/{song.id}/clip",
        json={"cut_start_time": 30.0, "clip_time": 12.0},
    )
    assert res.status_code == 200
    db_session.refresh(song)
    assert song.cut_start_time == 30.0
    assert song.clip_time == 12.0


def test_confirm_clip_trim_starts_download(client, db_session, project_ready_for_trim):
    project = project_ready_for_trim
    with patch("app.api.routes.job_runner.start_job", return_value=MagicMock(id="job-download")) as start_job:
        res = client.post(f"/api/projects/{project.id}/clip-trim/confirm")
    assert res.status_code == 200
    assert res.json()["jobId"] == "job-download"
    start_job.assert_called_once_with(project.id, JobType.DOWNLOAD)
    db_session.refresh(project)
    assert project.status == ProjectStatus.DOWNLOADING.value


def test_select_candidate_advances_to_clip_trim(client, db_session, project_with_two_songs_one_selected):
    project, song1, song2, cand2 = project_with_two_songs_one_selected
    res = client.post(
        f"/api/projects/{project.id}/songs/{song2.id}/candidates/select",
        json={"candidate_id": cand2.id},
    )
    assert res.status_code == 200
    assert res.json() == {"ok": True, "jobId": None}
    db_session.refresh(project)
    assert project.status == ProjectStatus.AWAITING_CLIP_TRIM.value
