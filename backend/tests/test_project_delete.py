from app.enums import ProjectStatus
from app.models import Project, Song, SongCandidate


def test_delete_project_with_selected_candidates(db_session):
    project = Project(title="Delete me", status=ProjectStatus.COMPLETED.value)
    db_session.add(project)
    db_session.flush()

    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Anime",
        song_type="opening",
        song_number=1,
        song_title="OP1",
        raw_theme_text="Artist - OP1",
        render_order=0,
    )
    db_session.add(song)
    db_session.flush()

    candidate = SongCandidate(
        song_id=song.id,
        youtube_id="abc123",
        url="https://youtube.com/watch?v=abc123",
        title="OP1 full",
        rank=1,
        is_selected=True,
    )
    db_session.add(candidate)
    db_session.flush()

    song.selected_candidate_id = candidate.id
    db_session.commit()

    project_id = project.id
    song_id = song.id
    candidate_id = candidate.id

    db_session.delete(project)
    db_session.commit()

    assert db_session.get(Project, project_id) is None
    assert db_session.get(Song, song_id) is None
    assert db_session.get(SongCandidate, candidate_id) is None
