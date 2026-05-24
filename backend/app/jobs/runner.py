import json
import re
import shutil
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.enums import (
    JobStatus,
    JobType,
    LogLevel,
    ProjectStatus,
    SongStatus,
    SongType,
)
from app.exceptions import CancelledJob, PrerequisiteError
from app.jobs.parallel import ParallelProgress, resolve_ffmpeg_workers, run_parallel
from app.jobs.websocket_manager import ws_manager
from app.models import AnimeCache, AppLock, Job, JobLog, Project, Song, SongCandidate, ThemeSong
from app.services import ffmpeg_engine, heatmap, overlay_renderer, theme_parser, youtube_sourcer
from app.services import anime_metadata
from app.services.paths import (
    final_output_path,
    song_clean_clip_path,
    song_download_path,
    song_overlayed_path,
)
from app.schemas.overlay import overlay_config_from_json
from app.state_machine import validate_transition


@dataclass
class _SourceCandidatesTask:
    song_id: str
    song_title: str
    anime_name: str
    song_type: str
    song_number: int
    artist: str | None
    song_aliases: list[str]
    anime_aliases: list[str]


@dataclass
class _DownloadTask:
    song_id: str
    song_title: str
    url: str
    out: Path


@dataclass
class _PrepareTask:
    song_id: str
    song_title: str
    inp: Path
    out: Path
    width: int
    height: int
    fps: int
    enc: str
    candidate_url: str | None
    clip_time: float
    audio_normalize: bool


@dataclass
class _OverlayTask:
    song_id: str
    song_title: str
    anime_name: str
    song_type: str
    song_number: int
    project_id: str
    clean_clip_path: Path
    candidate_view_count: int | None
    candidate_uploader: str | None
    width: int
    height: int
    enc: str


@dataclass
class _AudioTask:
    song_id: str
    song_title: str
    clip: Path
    audio_dir: Path


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _dedupe_text(values: list[str | None], *, exclude: list[str] | None = None) -> list[str]:
    excluded = {value.casefold() for value in (exclude or []) if value}
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        display = " ".join(str(value or "").split())
        key = display.casefold()
        if not display or key in seen or key in excluded:
            continue
        seen.add(key)
        result.append(display)
    return result


def _song_aliases_from_raw_theme_text(raw_text: str, song_title: str) -> list[str]:
    aliases: list[str | None] = []
    for quoted in re.findall(r'["“](.+?)["”]', raw_text):
        aliases.append(quoted)
        aliases.extend(re.findall(r"\(([^)]{2,})\)", quoted))
    for parenthetical in re.findall(r"\(([^)]{2,})\)", raw_text):
        if re.search(r"\b(?:ep|eps|episode|episodes)\b|\d+\s*-\s*\d+", parenthetical, re.IGNORECASE):
            continue
        aliases.append(parenthetical)
    return _dedupe_text(aliases, exclude=[song_title])


def _anime_aliases_from_cache(cache: AnimeCache | None, anime_name: str) -> list[str]:
    if cache is None:
        return []
    aliases: list[str | None] = [cache.title, cache.title_english]
    try:
        raw = json.loads(cache.raw_json or "{}")
    except json.JSONDecodeError:
        raw = {}
    title = raw.get("title")
    if isinstance(title, dict):
        aliases.extend([title.get("romaji"), title.get("english"), title.get("native")])
    aliases.extend([raw.get("title"), raw.get("title_english"), raw.get("title_japanese")])
    synonyms = raw.get("title_synonyms")
    if isinstance(synonyms, list):
        aliases.extend(str(item) for item in synonyms)
    return _dedupe_text(aliases, exclude=[anime_name])


def _parse_json_list(raw: str) -> list:
    try:
        return json.loads(raw) if raw else []
    except json.JSONDecodeError:
        return []


_PIPELINE_STAGES = [
    ProjectStatus.LOADING_THEMES,
    ProjectStatus.SOURCING,
    ProjectStatus.DOWNLOADING,
    ProjectStatus.PROBING_NORMALIZING,
    ProjectStatus.CUTTING,
    ProjectStatus.OVERLAYING,
    ProjectStatus.RENDERING,
]


def _overall_progress(status: ProjectStatus, stage_pct: float) -> float:
    if status not in _PIPELINE_STAGES:
        return min(max(stage_pct, 0.0), 100.0)
    idx = _PIPELINE_STAGES.index(status)
    span = 100.0 / len(_PIPELINE_STAGES)
    return min(99.0, idx * span + (stage_pct / 100.0) * span)


def _set_project_status(db: Session, project_id: str, status: ProjectStatus) -> None:
    project = db.get(Project, project_id)
    if project:
        project.status = status.value
        db.commit()


def _rollback(db: Session) -> None:
    try:
        db.rollback()
    except Exception:
        pass


def _log(db: Session, job: Job, message: str, level: LogLevel = LogLevel.INFO) -> None:
    db.add(JobLog(job_id=job.id, level=level.value, message=message))
    try:
        db.commit()
    except Exception:
        _rollback(db)
        raise


def _release_lock_safe() -> None:
    db = SessionLocal()
    try:
        _release_lock(db)
    finally:
        db.close()


async def _emit(job: Job, project: Project, progress: float, message: str) -> None:
    await ws_manager.broadcast(
        {
            "type": "job.progress",
            "projectId": project.id,
            "jobId": job.id,
            "stage": project.status,
            "progress": progress,
            "message": message,
        }
    )


def _get_lock(db: Session) -> AppLock:
    lock = db.get(AppLock, "global_pipeline")
    if not lock:
        lock = AppLock(id="global_pipeline")
        db.add(lock)
        db.commit()
    return lock


def _lock_is_available(db: Session, lock: AppLock) -> bool:
    if not lock.running_job_id:
        return True
    running = db.get(Job, lock.running_job_id)
    if not running or running.status != JobStatus.RUNNING.value:
        return True
    if not lock.last_heartbeat_at:
        return True
    age = (_utcnow() - _as_utc(lock.last_heartbeat_at)).total_seconds()
    return age >= settings.stale_lock_seconds


def _acquire_lock(db: Session, project_id: str, job_id: str) -> bool:
    lock = _get_lock(db)
    if not _lock_is_available(db, lock):
        return False
    lock.running_project_id = project_id
    lock.running_job_id = job_id
    lock.last_heartbeat_at = _utcnow()
    db.commit()
    return True


def release_lock_for_project(db: Session, project_id: str) -> None:
    lock = _get_lock(db)
    if lock.running_project_id == project_id:
        _release_lock(db)


def _release_lock(db: Session) -> None:
    lock = _get_lock(db)
    lock.running_project_id = None
    lock.running_job_id = None
    lock.last_heartbeat_at = _utcnow()
    db.commit()


def _heartbeat(db: Session) -> None:
    lock = _get_lock(db)
    lock.last_heartbeat_at = _utcnow()
    db.commit()


@contextmanager
def _heartbeat_while_running(db: Session, interval: float | None = None):
    tick_seconds = interval or max(settings.ws_heartbeat_seconds / 2, 15)
    stop = threading.Event()

    def tick() -> None:
        while not stop.wait(tick_seconds):
            hb_db = SessionLocal()
            try:
                _heartbeat(hb_db)
            finally:
                hb_db.close()

    thread = threading.Thread(target=tick, daemon=True)
    _heartbeat(db)
    thread.start()
    try:
        yield
    finally:
        stop.set()
        thread.join(timeout=1)
        _heartbeat(db)


def _require_all_candidates_selected(db: Session, project: Project) -> list[Song]:
    songs = list(project.songs)
    if not songs:
        raise PrerequisiteError("Project has no songs")
    for song in songs:
        if not song.selected_candidate_id:
            raise PrerequisiteError(f"No candidate selected for {song.song_title}")
        cand = db.get(SongCandidate, song.selected_candidate_id)
        if not cand or cand.song_id != song.id:
            raise PrerequisiteError(f"Invalid candidate for {song.song_title}")
    return songs


def _valid_existing_media(path: str | Path | None) -> bool:
    if not path:
        return False
    return ffmpeg_engine.is_valid_media(Path(path))


class JobRunner:
    def __init__(self) -> None:
        self._cancel_flags: dict[str, bool] = {}
        self._loop = None
        self._parallel_db_lock = threading.Lock()

    def set_event_loop(self, loop) -> None:
        self._loop = loop

    def request_cancel(self, job_id: str) -> None:
        self._cancel_flags[job_id] = True

    def _is_cancelled(self, job_id: str) -> bool:
        return self._cancel_flags.get(job_id, False)

    def _check_cancelled(self, job_id: str) -> None:
        if self._is_cancelled(job_id):
            raise CancelledJob()

    def _ffmpeg_log(self, db: Session, job: Job) -> Callable[[str], None]:
        def log(message: str) -> None:
            _log(db, job, message[:4000])

        return log

    def _log_step(self, db: Session, job: Job, message: str, level: LogLevel = LogLevel.INFO) -> None:
        _log(db, job, message, level)

    def _report_progress(
        self,
        db: Session,
        job: Job,
        project: Project,
        *,
        item_index: int,
        item_total: int,
        message: str,
        item_complete: bool = False,
    ) -> None:
        import asyncio

        stage_pct = ((item_index + (1 if item_complete else 0)) / max(item_total, 1)) * 100.0
        job.progress = _overall_progress(ProjectStatus(project.status), stage_pct)
        job.current_step = message
        db.commit()
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                _emit(job, project, job.progress, message),
                self._loop,
            )

    def _persist_parallel_item(
        self,
        *,
        job_id: str,
        project_id: str,
        progress: ParallelProgress,
        total: int,
        step: str,
        update: Callable[[Session, Job, Project], None],
    ) -> None:
        import asyncio

        with self._parallel_db_lock:
            wdb = SessionLocal()
            try:
                job = wdb.get(Job, job_id)
                project = wdb.get(Project, project_id)
                if not job or not project:
                    return
                update(wdb, job, project)
                completed = progress.increment()
                stage_pct = (completed / max(total, 1)) * 100.0
                job.progress = _overall_progress(ProjectStatus(project.status), stage_pct)
                job.current_step = step
                wdb.commit()
                if self._loop:
                    asyncio.run_coroutine_threadsafe(
                        _emit(job, project, job.progress, step),
                        self._loop,
                    )
            finally:
                wdb.close()

    def _run_parallel_stage(
        self,
        db: Session,
        job: Job,
        project: Project,
        items: list,
        *,
        max_workers: int,
        worker: Callable,
        on_complete: Callable,
    ) -> None:
        job_id = job.id

        with _heartbeat_while_running(db):
            run_parallel(
                items,
                worker,
                max_workers=max_workers,
                cancel_check=lambda: self._check_cancelled(job_id),
                on_complete=on_complete,
            )

    def start_job(self, project_id: str, job_type: JobType) -> Job:
        recover_stale_pipeline_jobs()
        db = SessionLocal()
        try:
            project = db.get(Project, project_id)
            if not project:
                raise ValueError("Project not found")
            job = Job(project_id=project_id, type=job_type.value, status=JobStatus.QUEUED.value)
            db.add(job)
            db.commit()
            db.refresh(job)
            thread = threading.Thread(target=self._run_job_thread, args=(job.id,), daemon=True)
            thread.start()
            return job
        finally:
            db.close()

    def _run_job_thread(self, job_id: str) -> None:
        db = SessionLocal()
        try:
            job = db.get(Job, job_id)
            if not job:
                return
            project = db.get(Project, job.project_id)
            if not project:
                return
            if not _acquire_lock(db, project.id, job.id):
                msg = "Another job is running"
                job.status = JobStatus.FAILED.value
                job.error_message = msg
                job.finished_at = _utcnow()
                project.status = ProjectStatus.FAILED.value
                project.error_message = msg
                _log(db, job, msg, LogLevel.ERROR)
                db.commit()
                return
            job.status = JobStatus.RUNNING.value
            job.started_at = _utcnow()
            db.commit()
            _log(db, job, f"Started {job.type} stage")
            handlers: dict[JobType, Callable] = {
                JobType.LOAD_THEMES: self._run_load_themes,
                JobType.SOURCE_CANDIDATES: self._run_source_candidates,
                JobType.DOWNLOAD: self._run_download,
                JobType.PROBE_NORMALIZE: self._run_probe_normalize,
                JobType.CUT: self._run_cut,
                JobType.OVERLAY: self._run_overlay,
                JobType.RENDER: self._run_render,
            }
            handler = handlers.get(JobType(job.type))
            try:
                self._check_cancelled(job.id)
                if handler:
                    handler(db, job, project)
                if self._is_cancelled(job.id):
                    project.status = ProjectStatus.CANCELLED.value
                    job.status = JobStatus.CANCELLED.value
                else:
                    job.status = JobStatus.COMPLETED.value
                    job.progress = 100.0
                    _log(db, job, f"Finished {job.type} stage")
                job.finished_at = _utcnow()
                db.commit()
            except CancelledJob:
                _rollback(db)
                job = db.get(Job, job_id)
                project = db.get(Project, job.project_id) if job else None
                if job and project:
                    project.status = ProjectStatus.CANCELLED.value
                    job.status = JobStatus.CANCELLED.value
                    job.finished_at = _utcnow()
                    _log(db, job, "Job cancelled", LogLevel.WARNING)
            except PrerequisiteError as e:
                _rollback(db)
                job = db.get(Job, job_id)
                project = db.get(Project, job.project_id) if job else None
                if job and project:
                    project.status = ProjectStatus.FAILED.value
                    project.error_message = str(e)
                    job.status = JobStatus.FAILED.value
                    job.error_message = str(e)
                    job.finished_at = _utcnow()
                    _log(db, job, str(e), LogLevel.ERROR)
            except Exception as e:
                _rollback(db)
                job = db.get(Job, job_id)
                project = db.get(Project, job.project_id) if job else None
                if job and project:
                    project.status = ProjectStatus.FAILED.value
                    project.error_message = str(e)
                    job.status = JobStatus.FAILED.value
                    job.error_message = str(e)
                    job.finished_at = _utcnow()
                    _log(db, job, str(e), LogLevel.ERROR)
            finally:
                _release_lock_safe()
                self._cancel_flags.pop(job_id, None)
                job = db.get(Job, job_id)
                project = db.get(Project, job.project_id) if job else None
                if self._loop and job and project:
                    import asyncio

                    asyncio.run_coroutine_threadsafe(
                        _emit(job, project, job.progress, job.current_step or ""),
                        self._loop,
                    )
                if project:
                    db.refresh(project)
                terminal = {
                    ProjectStatus.SONG_SELECTION,
                    ProjectStatus.AWAITING_CANDIDATES,
                    ProjectStatus.AWAITING_RENDER_ORDER,
                    ProjectStatus.COMPLETED,
                    ProjectStatus.FAILED,
                    ProjectStatus.CANCELLED,
                }
                if (
                    job
                    and project
                    and job.status == JobStatus.COMPLETED.value
                    and ProjectStatus(project.status) not in terminal
                ):
                    self._auto_continue(project.id)
        finally:
            db.close()

    def _auto_continue(self, project_id: str) -> None:
        from app.state_machine import job_type_for_status

        db = SessionLocal()
        try:
            project = db.get(Project, project_id)
            if not project:
                return
            jt = job_type_for_status(ProjectStatus(project.status))
            if jt:
                self.start_job(project_id, jt)
        finally:
            db.close()

    def _upsert_theme(self, db: Session, anime_mal_id: int, parsed) -> None:
        existing = (
            db.query(ThemeSong)
            .filter(
                ThemeSong.anime_mal_id == anime_mal_id,
                ThemeSong.song_type == parsed.song_type.value,
                ThemeSong.song_number == parsed.song_number,
                ThemeSong.raw_text == parsed.raw_text,
            )
            .first()
        )
        if existing:
            existing.song_title = parsed.song_title
            existing.artist = parsed.artist
            existing.cached_at = _utcnow()
            return
        db.add(
            ThemeSong(
                anime_mal_id=anime_mal_id,
                song_type=parsed.song_type.value,
                song_number=parsed.song_number,
                song_title=parsed.song_title,
                artist=parsed.artist,
                raw_text=parsed.raw_text,
            )
        )

    def _run_load_themes(self, db: Session, job: Job, project: Project) -> None:
        import asyncio

        song_types = [SongType(x) for x in _parse_json_list(project.song_types)]
        animes = list(project.animes)
        total = len(animes)
        for i, pa in enumerate(animes):
            self._check_cancelled(job.id)
            step = f"Loading themes for {pa.anime_name}"
            self._log_step(db, job, step)
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)

            with _heartbeat_while_running(db):
                try:
                    anime_data = asyncio.run(anime_metadata.get_anime(pa.anime_mal_id))
                except Exception as exc:
                    raise PrerequisiteError(
                        f"Failed to fetch metadata for {pa.anime_name} (MAL {pa.anime_mal_id}): {exc}"
                    ) from exc
            fields = anime_metadata.anime_to_cache_fields(anime_data)
            cache = db.get(AnimeCache, pa.anime_mal_id)
            if cache:
                for k, v in fields.items():
                    setattr(cache, k, v)
                cache.cached_at = _utcnow()
            else:
                db.add(AnimeCache(**fields, cached_at=_utcnow()))
            with _heartbeat_while_running(db):
                try:
                    openings, endings = asyncio.run(anime_metadata.get_themes(pa.anime_mal_id))
                except Exception as exc:
                    raise PrerequisiteError(
                        f"Failed to fetch themes for {pa.anime_name} (MAL {pa.anime_mal_id}): {exc}"
                    ) from exc
            parsed = theme_parser.parse_themes(openings, endings, song_types)
            for p in parsed:
                self._upsert_theme(db, pa.anime_mal_id, p)
            self._log_step(db, job, f"Cached {len(parsed)} themes for {pa.anime_name}")
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )

        validate_transition(ProjectStatus(project.status), ProjectStatus.SONG_SELECTION)
        project.status = ProjectStatus.SONG_SELECTION.value
        db.commit()

    def _run_source_candidates(self, db: Session, job: Job, project: Project) -> None:
        songs = list(project.songs)
        total = len(songs)
        for song in songs:
            db.query(SongCandidate).filter(SongCandidate.song_id == song.id).delete()
            song.status = SongStatus.SOURCING.value
        db.commit()

        progress = ParallelProgress()
        job_id = job.id
        project_id = project.id
        anime_cache_by_mal_id = {
            cache.mal_id: cache
            for cache in db.query(AnimeCache)
            .filter(AnimeCache.mal_id.in_({song.anime_mal_id for song in songs}))
            .all()
        }
        tasks = [
            _SourceCandidatesTask(
                song_id=song.id,
                song_title=song.song_title,
                anime_name=song.anime_name,
                song_type=song.song_type,
                song_number=song.song_number,
                artist=song.artist,
                song_aliases=_song_aliases_from_raw_theme_text(song.raw_theme_text, song.song_title),
                anime_aliases=_anime_aliases_from_cache(anime_cache_by_mal_id.get(song.anime_mal_id), song.anime_name),
            )
            for song in songs
        ]

        def work(task: _SourceCandidatesTask):
            return youtube_sourcer.source_candidates_for_song(
                task.anime_name,
                task.song_title,
                task.song_type,
                task.song_number,
                task.artist,
                top_n=settings.candidate_count,
                song_aliases=task.song_aliases,
                anime_aliases=task.anime_aliases,
            )

        def on_complete(task: _SourceCandidatesTask, results) -> None:
            step = f"Sourcing candidates for {task.song_title}"

            def update(wdb: Session, job: Job, project: Project) -> None:
                for rank, r in enumerate(results, start=1):
                    wdb.add(
                        SongCandidate(
                            song_id=task.song_id,
                            youtube_id=r.youtube_id,
                            url=r.url,
                            title=r.title,
                            uploader_name=r.uploader_name,
                            view_count=r.view_count,
                            duration=r.duration,
                            thumbnail_url=r.thumbnail_url,
                            score=r.score,
                            rank=rank,
                            rejection_flags=json.dumps(r.rejection_flags),
                            raw_metadata_json=json.dumps(r.raw_metadata, default=str),
                        )
                    )
                song = wdb.get(Song, task.song_id)
                if song:
                    song.status = SongStatus.AWAITING_SELECTION.value
                wdb.add(
                    JobLog(
                        job_id=job.id,
                        level=LogLevel.INFO.value,
                        message=f"Found {len(results)} candidates for {task.song_title}",
                    )
                )

            self._persist_parallel_item(
                job_id=job_id,
                project_id=project_id,
                progress=progress,
                total=total,
                step=step,
                update=update,
            )

        self._run_parallel_stage(
            db,
            job,
            project,
            tasks,
            max_workers=settings.youtube_workers,
            worker=work,
            on_complete=on_complete,
        )
        _set_project_status(db, project_id, ProjectStatus.AWAITING_CANDIDATES)

    def _run_download(self, db: Session, job: Job, project: Project) -> None:
        songs = _require_all_candidates_selected(db, project)
        total = len(songs)
        progress = ParallelProgress()
        tasks: list[_DownloadTask] = []
        job_id = job.id
        project_id = project.id

        for song in songs:
            song_id = song.id
            song_title = song.song_title
            cand = db.get(SongCandidate, song.selected_candidate_id)
            if not cand:
                raise PrerequisiteError(f"No candidate selected for {song_title}")
            out = song_download_path(project_id, song_id)
            out.parent.mkdir(parents=True, exist_ok=True)
            if song.download_path and ffmpeg_engine.is_valid_media(Path(song.download_path)):
                step = f"Skipping already downloaded {song_title}"
                self._log_step(db, job, step)
                completed = progress.increment()
                self._report_progress(
                    db,
                    job,
                    project,
                    item_index=completed - 1,
                    item_total=total,
                    message=step,
                    item_complete=True,
                )
                continue
            song.status = SongStatus.DOWNLOADING.value
            self._log_step(db, job, f"Downloading {song_title} ({cand.url})")
            tasks.append(
                _DownloadTask(song_id=song_id, song_title=song_title, url=cand.url, out=out)
            )
        db.commit()

        cancel_check = lambda: self._is_cancelled(job_id)

        def work(task: _DownloadTask) -> None:
            try:
                youtube_sourcer.yt_dlp_download(task.url, str(task.out), cancel_check=cancel_check)
            except CancelledJob:
                youtube_sourcer.cleanup_download_artifacts(task.out)
                raise
            except Exception:
                youtube_sourcer.cleanup_download_artifacts(task.out)
                raise
            if not ffmpeg_engine.is_valid_media(task.out):
                youtube_sourcer.cleanup_download_artifacts(task.out)
                raise RuntimeError(f"Downloaded file invalid for {task.song_title}")

        def on_complete(task: _DownloadTask, _result: None) -> None:
            step = f"Downloading {task.song_title}"

            def update(wdb: Session, job: Job, project: Project) -> None:
                song = wdb.get(Song, task.song_id)
                if song:
                    song.download_path = str(task.out)
                wdb.add(
                    JobLog(
                        job_id=job.id,
                        level=LogLevel.INFO.value,
                        message=f"Downloaded {task.out.name}",
                    )
                )

            self._persist_parallel_item(
                job_id=job_id,
                project_id=project_id,
                progress=progress,
                total=total,
                step=step,
                update=update,
            )

        self._run_parallel_stage(
            db,
            job,
            project,
            tasks,
            max_workers=settings.youtube_workers,
            worker=work,
            on_complete=on_complete,
        )
        _set_project_status(db, project_id, ProjectStatus.PROBING_NORMALIZING)

    def _run_probe_normalize(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
        workers = resolve_ffmpeg_workers(enc)
        songs = list(project.songs)
        total = len(songs)
        progress = ParallelProgress()
        tasks: list[_PrepareTask] = []
        job_id = job.id
        project_id = project.id
        target_width = project.target_width
        target_height = project.target_height
        target_fps = project.target_fps
        clip_time = project.clip_time
        audio_normalize = project.audio_normalize
        cancel_check = lambda: self._is_cancelled(job_id)

        for song in songs:
            song_id = song.id
            song_title = song.song_title
            if not song.download_path:
                raise RuntimeError(f"Missing download for {song_id}")
            if not ffmpeg_engine.is_valid_media(song.download_path):
                raise RuntimeError(f"Invalid media: {song.download_path}")
            out = song_clean_clip_path(project_id, song_id)
            out.parent.mkdir(parents=True, exist_ok=True)
            if _valid_existing_media(out):
                step = f"Skipping existing prepared clip for {song_title}"
                song.status = SongStatus.NORMALIZING.value
                song.clean_clip_path = str(out)
                self._log_step(db, job, step)
                completed = progress.increment()
                self._report_progress(
                    db,
                    job,
                    project,
                    item_index=completed - 1,
                    item_total=total,
                    message=step,
                    item_complete=True,
                )
                continue
            selected_candidate_id = song.selected_candidate_id
            cand = db.get(SongCandidate, selected_candidate_id) if selected_candidate_id else None
            song.status = SongStatus.NORMALIZING.value
            self._log_step(db, job, f"Preparing {song_title}")
            tasks.append(
                _PrepareTask(
                    song_id=song_id,
                    song_title=song_title,
                    inp=Path(song.download_path),
                    out=out,
                    width=target_width,
                    height=target_height,
                    fps=target_fps,
                    enc=enc,
                    candidate_url=cand.url if cand else None,
                    clip_time=clip_time,
                    audio_normalize=audio_normalize,
                )
            )
        db.commit()

        def work(task: _PrepareTask) -> dict:
            logs: list[str] = []
            meta = ffmpeg_engine.ffprobe_json(task.inp)
            duration = float(meta.get("format", {}).get("duration", 90))
            clip = min(task.clip_time, duration)
            heat = youtube_sourcer.fetch_heatmap(task.candidate_url) if task.candidate_url else None
            start, end = heatmap.highest_average_window(heat or [], clip, duration)
            if end - start < clip:
                end = min(duration, start + clip)
            cmd = ffmpeg_engine.build_prepare_clip_cmd(
                task.inp,
                task.out,
                start,
                end - start,
                task.width,
                task.height,
                task.fps,
                task.audio_normalize,
                task.enc,
            )
            ffmpeg_engine.run_ffmpeg(
                cmd,
                log_fn=logs.append,
                cancel_check=cancel_check,
            )
            return {"start": start, "end": end, "logs": logs}

        def on_complete(task: _PrepareTask, result: dict) -> None:
            step = f"Preparing {task.song_title}"

            def update(wdb: Session, job: Job, project: Project) -> None:
                for line in result["logs"]:
                    if line:
                        wdb.add(JobLog(job_id=job.id, level=LogLevel.INFO.value, message=line[:4000]))
                song = wdb.get(Song, task.song_id)
                if song:
                    song.clean_clip_path = str(task.out)
                    song.cut_start_time = result["start"]
                    song.cut_end_time = result["end"]
                    song.status = SongStatus.CUTTING.value
                wdb.add(
                    JobLog(
                        job_id=job.id,
                        level=LogLevel.INFO.value,
                        message=(
                            f"Prepared {task.song_title} "
                            f"({result['start']:.1f}s–{result['end']:.1f}s)"
                        ),
                    )
                )

            self._persist_parallel_item(
                job_id=job_id,
                project_id=project_id,
                progress=progress,
                total=total,
                step=step,
                update=update,
            )

        self._run_parallel_stage(
            db,
            job,
            project,
            tasks,
            max_workers=workers,
            worker=work,
            on_complete=on_complete,
        )
        _set_project_status(db, project_id, ProjectStatus.CUTTING)

    def _run_cut(self, db: Session, job: Job, project: Project) -> None:
        songs = list(project.songs)
        total = len(songs)
        for index, song in enumerate(songs):
            clean = song.clean_clip_path
            if not clean or not _valid_existing_media(clean):
                raise RuntimeError(f"Missing prepared clip for {song.song_title}")
            song.status = SongStatus.CUTTING.value
            step = f"Clip ready for {song.song_title}"
            self._log_step(db, job, step)
            self._report_progress(
                db,
                job,
                project,
                item_index=index,
                item_total=total,
                message=step,
                item_complete=True,
            )
        db.commit()
        _set_project_status(db, project.id, ProjectStatus.OVERLAYING)

    def _run_overlay(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
        songs = list(project.songs)
        total = len(songs)
        progress = ParallelProgress()
        tasks: list[_OverlayTask] = []
        job_id = job.id
        project_id = project.id
        target_width = project.target_width
        target_height = project.target_height

        overlay_config = overlay_config_from_json(project.overlay_config_json)
        if not overlay_config.enabled:
            for song in songs:
                clean = Path(song.clean_clip_path)
                if not clean.is_file() or not _valid_existing_media(clean):
                    raise RuntimeError(f"Missing prepared clip for {song.song_title}")
                out = song_overlayed_path(project_id, song.id)
                out.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(clean, out)
                song.overlayed_clip_path = str(out)
                song.status = SongStatus.READY.value
            db.commit()
            _set_project_status(db, project_id, ProjectStatus.AWAITING_RENDER_ORDER)
            return

        for song in songs:
            song_id = song.id
            song_title = song.song_title
            clean_clip_path = song.clean_clip_path
            if not clean_clip_path or not _valid_existing_media(clean_clip_path):
                raise RuntimeError(f"Missing prepared clip for {song_title}")
            song.status = SongStatus.OVERLAYING.value
            overlayed_path = song_overlayed_path(project_id, song_id)
            if overlayed_path.is_file() and _valid_existing_media(overlayed_path):
                step = f"Skipping existing overlay for {song_title}"
                song.overlayed_clip_path = str(overlayed_path)
                song.status = SongStatus.READY.value
                self._log_step(db, job, step)
                completed = progress.increment()
                self._report_progress(
                    db,
                    job,
                    project,
                    item_index=completed - 1,
                    item_total=total,
                    message=step,
                    item_complete=True,
                )
                db.commit()
                continue
            selected_candidate_id = song.selected_candidate_id
            cand = db.get(SongCandidate, selected_candidate_id) if selected_candidate_id else None
            self._log_step(db, job, f"Rendering overlay for {song_title}")
            tasks.append(
                _OverlayTask(
                    song_id=song_id,
                    song_title=song_title,
                    anime_name=song.anime_name,
                    song_type=song.song_type,
                    song_number=song.song_number,
                    project_id=project_id,
                    clean_clip_path=Path(clean_clip_path),
                    candidate_view_count=cand.view_count if cand else None,
                    candidate_uploader=cand.uploader_name if cand else None,
                    width=target_width,
                    height=target_height,
                    enc=enc,
                )
            )
        db.commit()

        overlay_filter = overlay_renderer.build_png_overlay_filter(overlay_config)

        def work(task: _OverlayTask) -> None:
            content = overlay_renderer.build_overlay_content(
                task.anime_name,
                task.song_type,
                task.song_number,
                task.song_title,
                task.candidate_view_count,
                task.candidate_uploader,
                config=overlay_config,
            )
            overlay_renderer.write_overlay_text_files(task.project_id, task.song_id, content)
            png_path = overlay_renderer.write_overlay_png(
                task.project_id,
                task.song_id,
                content,
                task.width,
                task.height,
                config=overlay_config,
            )
            out_path = song_overlayed_path(task.project_id, task.song_id)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            cmd = ffmpeg_engine.build_png_overlay_cmd(
                task.clean_clip_path,
                png_path,
                out_path,
                task.enc,
                overlay_filter,
            )
            ffmpeg_engine.run_ffmpeg(cmd)

        def on_complete(task: _OverlayTask, _result: None) -> None:
            step = f"Overlay complete for {task.song_title}"
            overlayed_path = song_overlayed_path(task.project_id, task.song_id)

            def update(wdb: Session, job: Job, project: Project) -> None:
                song = wdb.get(Song, task.song_id)
                if song:
                    song.overlayed_clip_path = str(overlayed_path)
                    song.status = SongStatus.READY.value
                wdb.add(
                    JobLog(
                        job_id=job.id,
                        level=LogLevel.INFO.value,
                        message=f"Overlay rendered for {task.song_title}",
                    )
                )

            self._persist_parallel_item(
                job_id=job_id,
                project_id=project_id,
                progress=progress,
                total=total,
                step=step,
                update=update,
            )

        self._run_parallel_stage(
            db,
            job,
            project,
            tasks,
            max_workers=min(len(tasks), resolve_ffmpeg_workers(enc)) if tasks else 1,
            worker=work,
            on_complete=on_complete,
        )
        _set_project_status(db, project_id, ProjectStatus.AWAITING_RENDER_ORDER)

    def _run_render(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
        workers = resolve_ffmpeg_workers(enc)
        songs = sorted(project.songs, key=lambda s: s.render_order)
        missing = [
            s
            for s in songs
            if not s.overlayed_clip_path or not Path(s.overlayed_clip_path).exists()
        ]
        if missing:
            titles = ", ".join(s.song_title for s in missing)
            raise RuntimeError(f"Missing overlay clips for: {titles}")
        audio_dir = Path(songs[0].overlayed_clip_path).parent / "_audio"
        total = len(songs) + 1
        progress = ParallelProgress()
        job_id = job.id
        project_id = project.id
        tasks = [
            _AudioTask(
                song_id=song.id,
                song_title=song.song_title,
                clip=Path(song.overlayed_clip_path),
                audio_dir=audio_dir,
            )
            for song in songs
        ]
        clip_by_song_id: dict[str, Path] = {}

        def work(task: _AudioTask) -> Path:
            return ffmpeg_engine.ensure_audio_clip(task.clip, task.audio_dir)

        def on_complete(task: _AudioTask, clip: Path) -> None:
            clip_by_song_id[task.song_id] = clip
            step = f"Preparing audio for {task.song_title}"
            self._persist_parallel_item(
                job_id=job_id,
                project_id=project_id,
                progress=progress,
                total=total,
                step=step,
                update=lambda _wdb, _job, _project: None,
            )

        for song in songs:
            step = f"Preparing audio for {song.song_title}"
            self._log_step(db, job, step)

        self._run_parallel_stage(
            db,
            job,
            project,
            tasks,
            max_workers=workers,
            worker=work,
            on_complete=on_complete,
        )
        clips = [clip_by_song_id[song.id] for song in songs]

        out = final_output_path(project.id, project.title)
        out.parent.mkdir(parents=True, exist_ok=True)
        step = "Rendering final video"
        self._log_step(db, job, step)
        self._report_progress(db, job, project, item_index=len(songs), item_total=total, message=step)
        cmd = ffmpeg_engine.build_concat_render_cmd(clips, out, settings.fade_seconds, enc)
        log_fn = self._ffmpeg_log(db, job)
        job_id = job.id
        with _heartbeat_while_running(db):
            ffmpeg_engine.run_ffmpeg(
                cmd,
                log_fn=log_fn,
                cancel_check=lambda: self._is_cancelled(job_id),
            )
        self._log_step(db, job, f"Final output written to {out.name}")
        self._report_progress(
            db, job, project, item_index=len(songs), item_total=total, message=step, item_complete=True
        )
        if not ffmpeg_engine.is_valid_media(out):
            raise RuntimeError("Final output invalid")
        project = db.get(Project, project_id)
        project.output_path = str(out)
        project.status = ProjectStatus.COMPLETED.value
        db.commit()


def recover_stale_pipeline_jobs() -> int:
    """Mark running jobs as failed when the global lock heartbeat is stale."""
    db = SessionLocal()
    recovered = 0
    try:
        lock = _get_lock(db)
        if not lock.running_job_id or not lock.last_heartbeat_at:
            return 0
        age = (_utcnow() - _as_utc(lock.last_heartbeat_at)).total_seconds()
        if age < settings.stale_lock_seconds:
            return 0
        job = db.get(Job, lock.running_job_id)
        if not job or job.status != JobStatus.RUNNING.value:
            lock.running_job_id = None
            lock.running_project_id = None
            db.commit()
            return 0
        project = db.get(Project, job.project_id)
        now = _utcnow()
        job.status = JobStatus.FAILED.value
        job.error_message = "Job interrupted (pipeline lock expired)"
        job.finished_at = now
        if project:
            project.status = ProjectStatus.FAILED.value
            project.error_message = job.error_message
        lock.running_job_id = None
        lock.running_project_id = None
        lock.last_heartbeat_at = now
        db.add(
            JobLog(
                job_id=job.id,
                level=LogLevel.ERROR.value,
                message=job.error_message,
            )
        )
        db.commit()
        recovered = 1
    finally:
        db.close()
    return recovered


job_runner = JobRunner()
