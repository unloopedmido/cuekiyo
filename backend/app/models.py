import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums import Encoder, JobStatus, JobType, LogLevel, ProjectStatus, SongStatus, SongType


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default=ProjectStatus.DRAFT.value)
    songs_count: Mapped[int] = mapped_column(Integer, default=5)
    song_types: Mapped[str] = mapped_column(Text, default='["opening"]')
    clip_time: Mapped[float] = mapped_column(Float, default=10.0)
    target_width: Mapped[int] = mapped_column(Integer, default=1920)
    target_height: Mapped[int] = mapped_column(Integer, default=1080)
    target_fps: Mapped[int] = mapped_column(Integer, default=30)
    target_aspect_ratio: Mapped[str] = mapped_column(String(16), default="16:9")
    encoder: Mapped[str] = mapped_column(String(32), default=Encoder.AUTO.value)
    audio_normalize: Mapped[bool] = mapped_column(Boolean, default=True)
    overlay_template_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    animes: Mapped[list["ProjectAnime"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    songs: Mapped[list["Song"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    jobs: Mapped[list["Job"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectAnime(Base):
    __tablename__ = "project_animes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"))
    anime_mal_id: Mapped[int] = mapped_column(Integer)
    anime_name: Mapped[str] = mapped_column(String(512))
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped["Project"] = relationship(back_populates="animes")


class AnimeCache(Base):
    __tablename__ = "anime_cache"

    mal_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(512))
    title_english: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_json: Mapped[str] = mapped_column(Text, default="{}")
    cached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ThemeSong(Base):
    __tablename__ = "theme_songs"
    __table_args__ = (
        UniqueConstraint("anime_mal_id", "song_type", "song_number", "raw_text", name="uq_theme_song"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    anime_mal_id: Mapped[int] = mapped_column(Integer, index=True)
    song_type: Mapped[str] = mapped_column(String(16))
    song_number: Mapped[int] = mapped_column(Integer)
    song_title: Mapped[str] = mapped_column(String(512))
    artist: Mapped[str | None] = mapped_column(String(512), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    cached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = (UniqueConstraint("project_id", "render_order", name="uq_song_render_order"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"))
    anime_mal_id: Mapped[int] = mapped_column(Integer)
    anime_name: Mapped[str] = mapped_column(String(512))
    song_type: Mapped[str] = mapped_column(String(16))
    song_number: Mapped[int] = mapped_column(Integer)
    song_title: Mapped[str] = mapped_column(String(512))
    artist: Mapped[str | None] = mapped_column(String(512), nullable=True)
    raw_theme_text: Mapped[str] = mapped_column(Text)
    selected_candidate_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("song_candidates.id"), nullable=True
    )
    download_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    clean_clip_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    overlayed_clip_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    cut_start_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    cut_end_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    render_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default=SongStatus.PENDING.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    project: Mapped["Project"] = relationship(back_populates="songs")
    candidates: Mapped[list["SongCandidate"]] = relationship(
        back_populates="song",
        cascade="all, delete-orphan",
        foreign_keys="SongCandidate.song_id",
    )


class SongCandidate(Base):
    __tablename__ = "song_candidates"
    __table_args__ = (UniqueConstraint("song_id", "rank", name="uq_candidate_rank"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    song_id: Mapped[str] = mapped_column(String(36), ForeignKey("songs.id", ondelete="CASCADE"))
    youtube_id: Mapped[str] = mapped_column(String(32))
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    uploader_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    view_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    rejection_flags: Mapped[str] = mapped_column(Text, default="[]")
    raw_metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    song: Mapped["Song"] = relationship(back_populates="candidates", foreign_keys=[song_id])


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default=JobStatus.QUEUED.value)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    current_step: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_state_snapshot: Mapped[str] = mapped_column(Text, default="{}")
    output_state_snapshot: Mapped[str] = mapped_column(Text, default="{}")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="jobs")
    logs: Mapped[list["JobLog"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobLog(Base):
    __tablename__ = "job_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"))
    level: Mapped[str] = mapped_column(String(16), default=LogLevel.INFO.value)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    job: Mapped["Job"] = relationship(back_populates="logs")


class AppLock(Base):
    __tablename__ = "app_lock"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default="global_pipeline")
    running_project_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    running_job_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
