import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.enums import ProjectStatus, SourceMode
from app.models import AppLock, Project, ProjectAnime, Song


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
