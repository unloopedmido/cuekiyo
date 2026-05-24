from app.enums import ProjectStatus
from app.state_machine import can_transition, next_auto_status_after_user_gate


def test_candidates_advance_to_clip_trim_not_download():
    assert can_transition(ProjectStatus.AWAITING_CANDIDATES, ProjectStatus.AWAITING_CLIP_TRIM)
    assert can_transition(ProjectStatus.AWAITING_CLIP_TRIM, ProjectStatus.DOWNLOADING)
    assert not can_transition(ProjectStatus.AWAITING_CANDIDATES, ProjectStatus.DOWNLOADING)
    assert next_auto_status_after_user_gate(ProjectStatus.AWAITING_CANDIDATES) == ProjectStatus.AWAITING_CLIP_TRIM
    assert next_auto_status_after_user_gate(ProjectStatus.AWAITING_CLIP_TRIM) == ProjectStatus.DOWNLOADING


def test_song_clip_time_column_exists(db_session):
    from app.models import Song, Project

    project = Project(title="T")
    db_session.add(project)
    db_session.flush()
    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="A",
        song_type="opening",
        song_number=1,
        song_title="S",
        raw_theme_text="OP1",
        clip_time=15.0,
        cut_start_time=42.0,
    )
    db_session.add(song)
    db_session.commit()
    assert song.clip_time == 15.0
    assert song.cut_start_time == 42.0
