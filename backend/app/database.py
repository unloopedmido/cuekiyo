from collections.abc import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _connection_record) -> None:
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_sqlite_columns() -> None:
    """Add columns introduced after first deploy (create_all does not ALTER)."""
    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("projects")}
    additions: list[tuple[str, str]] = [
        ("source_mode", "VARCHAR(16) NOT NULL DEFAULT 'auto'"),
        ("overlay_config_json", "TEXT NOT NULL DEFAULT '{}'"),
        ("fade_seconds", "FLOAT NOT NULL DEFAULT 0.5"),
        ("unlimited_songs", "BOOLEAN NOT NULL DEFAULT 0"),
    ]
    with engine.begin() as conn:
        for name, ddl in additions:
            if name not in existing:
                conn.execute(text(f"ALTER TABLE projects ADD COLUMN {name} {ddl}"))

    if "songs" in inspector.get_table_names():
        song_cols = {col["name"] for col in inspector.get_columns("songs")}
        if "clip_time" not in song_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE songs ADD COLUMN clip_time FLOAT"))

    if "song_candidates" in inspector.get_table_names():
        cand_cols = {col["name"] for col in inspector.get_columns("song_candidates")}
        if "is_manual" not in cand_cols:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE song_candidates ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT 0"
                    )
                )


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_columns()
