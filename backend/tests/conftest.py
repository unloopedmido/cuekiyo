import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.enums import ProjectStatus, SourceMode, SongStatus
from app.models import AppLock, Project, ProjectAnime, Song, SongCandidate


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record) -> None:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    session.add(AppLock(id="global_pipeline"))
    session.commit()
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def project_with_manual_song(db_session):
    project = Project(
        title="Manual Project",
        status=ProjectStatus.AWAITING_CANDIDATES.value,
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
    return project, song


@pytest.fixture()
def project_with_selected_songs(db_session):
    project = Project(
        title="Trim Project",
        status=ProjectStatus.AWAITING_CANDIDATES.value,
        source_mode=SourceMode.AUTO.value,
        songs_count=1,
        song_types='["opening"]',
        clip_time=10.0,
    )
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="Anime", display_order=0)
    )
    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Anime",
        song_type="opening",
        song_number=1,
        song_title="Song",
        raw_theme_text="OP1",
        render_order=0,
        status=SongStatus.SELECTED.value,
    )
    db_session.add(song)
    db_session.flush()
    cand = SongCandidate(
        song_id=song.id,
        youtube_id="abc12345678",
        url="https://www.youtube.com/watch?v=abc12345678",
        title="Candidate",
        rank=1,
        is_selected=True,
    )
    db_session.add(cand)
    db_session.flush()
    song.selected_candidate_id = cand.id
    db_session.commit()
    return project, song


@pytest.fixture()
def project_ready_for_trim(db_session, project_with_selected_songs):
    project, _song = project_with_selected_songs
    project.status = ProjectStatus.AWAITING_CLIP_TRIM.value
    db_session.commit()
    return project


@pytest.fixture()
def project_with_two_songs_one_selected(db_session):
    project = Project(
        title="Two Song Project",
        status=ProjectStatus.AWAITING_CANDIDATES.value,
        source_mode=SourceMode.AUTO.value,
        songs_count=2,
        song_types='["opening"]',
        clip_time=10.0,
    )
    db_session.add(project)
    db_session.flush()
    db_session.add(
        ProjectAnime(project_id=project.id, anime_mal_id=1, anime_name="Anime", display_order=0)
    )
    song1 = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Anime",
        song_type="opening",
        song_number=1,
        song_title="Song 1",
        raw_theme_text="OP1",
        render_order=0,
        status=SongStatus.SELECTED.value,
    )
    song2 = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Anime",
        song_type="opening",
        song_number=2,
        song_title="Song 2",
        raw_theme_text="OP2",
        render_order=1,
    )
    db_session.add_all([song1, song2])
    db_session.flush()
    cand1 = SongCandidate(
        song_id=song1.id,
        youtube_id="video1111111",
        url="https://www.youtube.com/watch?v=video1111111",
        title="Candidate 1",
        rank=1,
        is_selected=True,
    )
    cand2 = SongCandidate(
        song_id=song2.id,
        youtube_id="video2222222",
        url="https://www.youtube.com/watch?v=video2222222",
        title="Candidate 2",
        rank=1,
        is_selected=False,
    )
    db_session.add_all([cand1, cand2])
    db_session.flush()
    song1.selected_candidate_id = cand1.id
    db_session.commit()
    return project, song1, song2, cand2
