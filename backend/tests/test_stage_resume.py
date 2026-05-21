from unittest.mock import patch

from app.enums import JobStatus, ProjectStatus, SongStatus
from app.jobs.runner import JobRunner
from app.models import Job, Project, Song


def _project_with_song(db_session, status: ProjectStatus) -> tuple[Project, Job, Song]:
    job_type_by_status = {
        ProjectStatus.PROBING_NORMALIZING: "probe_normalize",
        ProjectStatus.CUTTING: "cut",
        ProjectStatus.OVERLAYING: "overlay",
    }
    project = Project(title="Resume", status=status.value, song_types='["opening"]')
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
        download_path="/tmp/download.mp4",
        clean_clip_path="/tmp/clean.mp4",
    )
    db_session.add(song)
    db_session.flush()
    job = Job(
        project_id=project.id,
        type=job_type_by_status[status],
        status=JobStatus.RUNNING.value,
    )
    db_session.add(job)
    db_session.commit()
    return project, job, song


def test_probe_normalize_skips_existing_valid_output(db_session, tmp_path, monkeypatch):
    project, job, song = _project_with_song(db_session, ProjectStatus.PROBING_NORMALIZING)
    expected = tmp_path / "clean.mp4"
    expected.write_bytes(b"valid")

    runner = JobRunner()

    monkeypatch.setattr("app.jobs.runner.song_clean_clip_path", lambda project_id, song_id: expected)
    monkeypatch.setattr("app.services.ffmpeg_engine.is_valid_media", lambda path: True)
    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        runner._run_probe_normalize(db_session, job, project)

    run_ffmpeg.assert_not_called()
    db_session.refresh(project)
    db_session.refresh(song)
    assert project.status == ProjectStatus.CUTTING.value
    assert song.clean_clip_path == str(expected)


def test_overlay_skips_existing_overlay_files(db_session, tmp_path, monkeypatch):
    project, job, song = _project_with_song(db_session, ProjectStatus.OVERLAYING)
    clean = tmp_path / "clean.mp4"
    clean.write_bytes(b"valid")
    song.clean_clip_path = str(clean)
    song.overlayed_clip_path = str(clean)
    db_session.commit()

    overlay_dir = tmp_path / "overlays"
    overlay_dir.mkdir()
    for name in ("anime", "song", "meta"):
        (overlay_dir / f"{song.id}_{name}.txt").write_text(name, encoding="utf-8")

    runner = JobRunner()

    monkeypatch.setattr(
        "app.services.overlay_renderer.overlay_text_file_paths",
        lambda project_id, song_id: {
            "anime": overlay_dir / f"{song_id}_anime.txt",
            "song": overlay_dir / f"{song_id}_song.txt",
            "meta": overlay_dir / f"{song_id}_meta.txt",
        },
    )
    monkeypatch.setattr("app.services.ffmpeg_engine.is_valid_media", lambda path: True)
    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        runner._run_overlay(db_session, job, project)

    run_ffmpeg.assert_not_called()
    db_session.refresh(project)
    db_session.refresh(song)
    assert project.status == ProjectStatus.AWAITING_RENDER_ORDER.value
    assert song.status == SongStatus.READY.value


def test_cut_advances_when_clean_clips_exist(db_session, tmp_path, monkeypatch):
    project, job, song = _project_with_song(db_session, ProjectStatus.CUTTING)
    clean = tmp_path / "clean.mp4"
    clean.write_bytes(b"valid")
    song.clean_clip_path = str(clean)
    db_session.commit()

    runner = JobRunner()

    monkeypatch.setattr("app.services.ffmpeg_engine.is_valid_media", lambda path: True)
    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        runner._run_cut(db_session, job, project)

    run_ffmpeg.assert_not_called()
    db_session.refresh(project)
    assert project.status == ProjectStatus.OVERLAYING.value
