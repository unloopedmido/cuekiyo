import json
import threading
from contextlib import contextmanager
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
from app.jobs.websocket_manager import ws_manager
from app.models import AnimeCache, AppLock, Job, JobLog, Project, Song, SongCandidate, ThemeSong
from app.services import ffmpeg_engine, heatmap, overlay_renderer, theme_parser, youtube_sourcer
from app.services import jikan_client
from app.services.paths import (
    final_output_path,
    song_clean_clip_path,
    song_download_path,
    song_normalized_path,
    song_overlayed_path,
)
from app.state_machine import validate_transition


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


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


def _log(db: Session, job: Job, message: str, level: LogLevel = LogLevel.INFO) -> None:
    db.add(JobLog(job_id=job.id, level=level.value, message=message))
    db.commit()


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


def _acquire_lock(db: Session, project_id: str, job_id: str) -> bool:
    lock = _get_lock(db)
    if lock.running_job_id and lock.last_heartbeat_at:
        age = (_utcnow() - _as_utc(lock.last_heartbeat_at)).total_seconds()
        if age < settings.stale_lock_seconds:
            return False
    lock.running_project_id = project_id
    lock.running_job_id = job_id
    lock.last_heartbeat_at = _utcnow()
    db.commit()
    return True


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
            _heartbeat(db)

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


class JobRunner:
    def __init__(self) -> None:
        self._cancel_flags: dict[str, bool] = {}
        self._loop = None

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

    def start_job(self, project_id: str, job_type: JobType) -> Job:
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
                job.status = JobStatus.FAILED.value
                job.error_message = "Another job is running"
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
                project.status = ProjectStatus.CANCELLED.value
                job.status = JobStatus.CANCELLED.value
                job.finished_at = _utcnow()
                _log(db, job, "Job cancelled", LogLevel.WARNING)
                db.commit()
            except PrerequisiteError as e:
                project.status = ProjectStatus.FAILED.value
                project.error_message = str(e)
                job.status = JobStatus.FAILED.value
                job.error_message = str(e)
                job.finished_at = _utcnow()
                _log(db, job, str(e), LogLevel.ERROR)
                db.commit()
            except Exception as e:
                project.status = ProjectStatus.FAILED.value
                project.error_message = str(e)
                job.status = JobStatus.FAILED.value
                job.error_message = str(e)
                job.finished_at = _utcnow()
                _log(db, job, str(e), LogLevel.ERROR)
                db.commit()
            finally:
                _release_lock(db)
                self._cancel_flags.pop(job.id, None)
                if self._loop:
                    import asyncio

                    asyncio.run_coroutine_threadsafe(
                        _emit(job, project, job.progress, job.current_step or ""),
                        self._loop,
                    )
                db.refresh(project)
                if job.status == JobStatus.COMPLETED.value and ProjectStatus(project.status) not in (
                    ProjectStatus.SONG_SELECTION,
                    ProjectStatus.AWAITING_CANDIDATES,
                    ProjectStatus.AWAITING_RENDER_ORDER,
                    ProjectStatus.COMPLETED,
                    ProjectStatus.FAILED,
                    ProjectStatus.CANCELLED,
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
                anime_data = asyncio.run(jikan_client.get_anime(pa.anime_mal_id))
            fields = jikan_client.anime_to_cache_fields(anime_data)
            cache = db.get(AnimeCache, pa.anime_mal_id)
            if cache:
                for k, v in fields.items():
                    setattr(cache, k, v)
                cache.cached_at = _utcnow()
            else:
                db.add(AnimeCache(**fields, cached_at=_utcnow()))
            openings, endings = jikan_client.extract_themes(anime_data)
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
        for i, song in enumerate(songs):
            self._check_cancelled(job.id)
            song.status = SongStatus.SOURCING.value
            step = f"Sourcing candidates for {song.song_title}"
            self._log_step(db, job, step)
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)
            db.query(SongCandidate).filter(SongCandidate.song_id == song.id).delete()
            with _heartbeat_while_running(db):
                results = youtube_sourcer.source_candidates_for_song(
                    song.anime_name,
                    song.song_title,
                    song.song_type,
                    song.song_number,
                    song.artist,
                    top_n=settings.candidate_count,
                )
            for rank, r in enumerate(results, start=1):
                db.add(
                    SongCandidate(
                        song_id=song.id,
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
            song.status = SongStatus.AWAITING_SELECTION.value
            self._log_step(db, job, f"Found {len(results)} candidates for {song.song_title}")
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )
            db.commit()
        project.status = ProjectStatus.AWAITING_CANDIDATES.value
        db.commit()

    def _run_download(self, db: Session, job: Job, project: Project) -> None:
        songs = _require_all_candidates_selected(db, project)
        total = len(songs)
        for i, song in enumerate(songs):
            self._check_cancelled(job.id)
            cand = db.get(SongCandidate, song.selected_candidate_id)
            if not cand:
                raise PrerequisiteError(f"Missing candidate for {song.song_title}")
            out = song_download_path(project.id, song.id)
            out.parent.mkdir(parents=True, exist_ok=True)
            song.status = SongStatus.DOWNLOADING.value
            step = f"Downloading {song.song_title}"
            self._log_step(db, job, f"{step} ({cand.url})")
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)
            db.commit()
            try:
                with _heartbeat_while_running(db):
                    youtube_sourcer.yt_dlp_download(
                        cand.url,
                        str(out),
                        cancel_check=lambda: self._is_cancelled(job.id),
                    )
            except CancelledJob:
                youtube_sourcer.cleanup_download_artifacts(out)
                raise
            except Exception:
                youtube_sourcer.cleanup_download_artifacts(out)
                raise
            if not ffmpeg_engine.is_valid_media(out):
                youtube_sourcer.cleanup_download_artifacts(out)
                raise RuntimeError(f"Downloaded file invalid for {song.song_title}")
            song.download_path = str(out)
            self._log_step(db, job, f"Downloaded {out.name}")
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )
            db.commit()
        project.status = ProjectStatus.PROBING_NORMALIZING.value
        db.commit()

    def _run_probe_normalize(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
        songs = list(project.songs)
        total = len(songs)
        log_fn = self._ffmpeg_log(db, job)
        for i, song in enumerate(songs):
            self._check_cancelled(job.id)
            if not song.download_path:
                raise RuntimeError(f"Missing download for {song.id}")
            if not ffmpeg_engine.is_valid_media(song.download_path):
                raise RuntimeError(f"Invalid media: {song.download_path}")
            out = song_normalized_path(project.id, song.id)
            out.parent.mkdir(parents=True, exist_ok=True)
            song.status = SongStatus.NORMALIZING.value
            step = f"Normalizing {song.song_title}"
            self._log_step(db, job, step)
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)
            cmd = ffmpeg_engine.build_normalize_cmd(
                Path(song.download_path),
                out,
                project.target_width,
                project.target_height,
                project.target_fps,
                enc,
            )
            with _heartbeat_while_running(db):
                ffmpeg_engine.run_ffmpeg(
                    cmd,
                    log_fn=log_fn,
                    cancel_check=lambda: self._is_cancelled(job.id),
                )
            self._log_step(db, job, f"Normalized {song.song_title}")
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )
            db.commit()
        project.status = ProjectStatus.CUTTING.value
        db.commit()

    def _normalized_input(self, project_id: str, song: Song) -> Path:
        norm = song_normalized_path(project_id, song.id)
        if norm.exists():
            return norm
        if song.download_path:
            return Path(song.download_path)
        raise RuntimeError(f"Missing normalized media for {song.song_title}")

    def _run_cut(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
        log_fn = self._ffmpeg_log(db, job)
        songs = list(project.songs)
        total = len(songs)
        for i, song in enumerate(songs):
            self._check_cancelled(job.id)
            inp = self._normalized_input(project.id, song)
            song.status = SongStatus.CUTTING.value
            step = f"Cutting {song.song_title}"
            self._log_step(db, job, step)
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)
            meta = ffmpeg_engine.ffprobe_json(inp)
            duration = float(meta.get("format", {}).get("duration", 90))
            clip = min(project.clip_time, duration)
            cand = db.get(SongCandidate, song.selected_candidate_id) if song.selected_candidate_id else None
            with _heartbeat_while_running(db):
                heat = youtube_sourcer.fetch_heatmap(cand.url) if cand else None
            start, end = heatmap.highest_average_window(heat or [], clip, duration)
            if end - start < clip:
                end = min(duration, start + clip)
            out = song_clean_clip_path(project.id, song.id)
            out.parent.mkdir(parents=True, exist_ok=True)
            cmd = ffmpeg_engine.build_cut_cmd(inp, out, start, end - start, project.audio_normalize, enc)
            with _heartbeat_while_running(db):
                ffmpeg_engine.run_ffmpeg(
                    cmd,
                    log_fn=log_fn,
                    cancel_check=lambda: self._is_cancelled(job.id),
                )
            song.clean_clip_path = str(out)
            song.cut_start_time = start
            song.cut_end_time = end
            self._log_step(db, job, f"Cut {song.song_title} ({start:.1f}s–{end:.1f}s)")
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )
            db.commit()
        project.status = ProjectStatus.OVERLAYING.value
        db.commit()

    def _run_overlay(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
        log_fn = self._ffmpeg_log(db, job)
        songs = list(project.songs)
        total = len(songs)
        for i, song in enumerate(songs):
            self._check_cancelled(job.id)
            song.status = SongStatus.OVERLAYING.value
            step = f"Overlaying {song.song_title}"
            self._log_step(db, job, step)
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)
            cand = db.get(SongCandidate, song.selected_candidate_id) if song.selected_candidate_id else None
            content = overlay_renderer.build_overlay_content(
                song.anime_name,
                song.song_type,
                song.song_number,
                song.song_title,
                cand.view_count if cand else None,
                cand.uploader_name if cand else None,
            )
            text_files = overlay_renderer.write_overlay_text_files(project.id, song.id, content)
            font = overlay_renderer.resolve_font()
            video_filter = overlay_renderer.build_drawtext_filter(
                text_files,
                project.target_width,
                project.target_height,
                font,
            )
            inp = Path(song.clean_clip_path)
            out = song_overlayed_path(project.id, song.id)
            out.parent.mkdir(parents=True, exist_ok=True)
            cmd = ffmpeg_engine.build_overlay_cmd(inp, out, enc, video_filter)
            with _heartbeat_while_running(db):
                ffmpeg_engine.run_ffmpeg(
                    cmd,
                    log_fn=log_fn,
                    cancel_check=lambda: self._is_cancelled(job.id),
                )
            song.overlayed_clip_path = str(out)
            song.status = SongStatus.READY.value
            self._log_step(db, job, f"Overlay complete for {song.song_title}")
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )
            db.commit()
        project.status = ProjectStatus.AWAITING_RENDER_ORDER.value
        db.commit()

    def _run_render(self, db: Session, job: Job, project: Project) -> None:
        from app.enums import Encoder

        enc = ffmpeg_engine.detect_encoder(Encoder(project.encoder))
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
        clips: list[Path] = []
        log_fn = self._ffmpeg_log(db, job)
        total = len(songs) + 1
        for i, song in enumerate(songs):
            step = f"Preparing audio for {song.song_title}"
            self._log_step(db, job, step)
            self._report_progress(db, job, project, item_index=i, item_total=total, message=step)
            clip = Path(song.overlayed_clip_path)
            with _heartbeat_while_running(db):
                clips.append(ffmpeg_engine.ensure_audio_clip(clip, audio_dir))
            self._report_progress(
                db, job, project, item_index=i, item_total=total, message=step, item_complete=True
            )
        out = final_output_path(project.id, project.title)
        out.parent.mkdir(parents=True, exist_ok=True)
        step = "Rendering final video"
        self._log_step(db, job, step)
        self._report_progress(db, job, project, item_index=len(songs), item_total=total, message=step)
        cmd = ffmpeg_engine.build_concat_render_cmd(clips, out, settings.fade_seconds, enc)
        with _heartbeat_while_running(db):
            ffmpeg_engine.run_ffmpeg(
                cmd,
                log_fn=log_fn,
                cancel_check=lambda: self._is_cancelled(job.id),
            )
        self._log_step(db, job, f"Final output written to {out.name}")
        self._report_progress(
            db, job, project, item_index=len(songs), item_total=total, message=step, item_complete=True
        )
        if not ffmpeg_engine.is_valid_media(out):
            raise RuntimeError("Final output invalid")
        project.output_path = str(out)
        project.status = ProjectStatus.COMPLETED.value
        db.commit()


job_runner = JobRunner()
