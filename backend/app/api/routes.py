import json
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import JobType, ProjectStatus, SongStatus
from app.jobs.runner import job_runner, release_lock_for_project
from app.jobs.websocket_manager import ws_manager
from app.models import AnimeCache, Job, JobLog, Project, ProjectAnime, Song, SongCandidate, ThemeSong
from app.schemas.anime import AnimeSearchResult, ThemeSongOut
from app.schemas.job import JobLogOut, JobOut
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate, RenderOrderUpdate
from app.schemas.settings import AppSettingsOut, AppSettingsUpdate
from app.services import anime_metadata, ffmpeg_engine, overlay_renderer
from app.services.paths import project_dir
from app.schemas.song import CandidateOut, CandidateSelectRequest, SongOut, SongSelectRequest
from app.config import settings, save_settings
from app.exceptions import PrerequisiteError
from app.state_machine import (
    is_deletable,
    is_editable,
    job_type_for_status,
    next_auto_status_after_user_gate,
    retry_target_status,
    validate_transition,
    validate_user_gate_prerequisites,
)
from app.api.deps import anime_image_map, project_to_out

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/system/binaries")
def binaries():
    checks = {
        "yt-dlp": ffmpeg_engine.check_binary("yt-dlp"),
        "ffmpeg": ffmpeg_engine.check_binary("ffmpeg"),
        "ffprobe": ffmpeg_engine.check_binary("ffprobe"),
        "overlay": overlay_renderer.check_overlay_support(),
    }
    return {
        name: {"available": ok, "detail": detail}
        for name, (ok, detail) in checks.items()
    }


@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    images = anime_image_map(db, projects)
    return [project_to_out(p, images) for p in projects]


@router.post("/projects", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        title=body.title,
        songs_count=body.songs_count,
        song_types=json.dumps([t.value for t in body.song_types]),
        clip_time=body.clip_time,
        target_width=body.target_width,
        target_height=body.target_height,
        target_fps=body.target_fps,
        target_aspect_ratio=body.target_aspect_ratio,
        encoder=body.encoder.value,
        audio_normalize=body.audio_normalize,
        status=ProjectStatus.DRAFT.value,
    )
    db.add(project)
    db.flush()
    for a in body.animes:
        db.add(
            ProjectAnime(
                project_id=project.id,
                anime_mal_id=a.anime_mal_id,
                anime_name=a.anime_name,
                display_order=a.display_order,
            )
        )
        if a.image_url:
            cache = db.get(AnimeCache, a.anime_mal_id)
            if cache is None:
                db.add(
                    AnimeCache(
                        mal_id=a.anime_mal_id,
                        title=a.anime_name,
                        image_url=a.image_url,
                        raw_json="{}",
                    )
                )
            elif not cache.image_url:
                cache.image_url = a.image_url
    db.commit()
    db.refresh(project)
    images = anime_image_map(db, [project])
    return project_to_out(project, images)


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    images = anime_image_map(db, [project])
    return project_to_out(project, images)


@router.patch("/projects/{project_id}")
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if not is_editable(ProjectStatus(project.status)):
        raise HTTPException(400, "Project not editable in current status")
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "song_types" and value is not None:
            setattr(project, field, json.dumps([t.value for t in value]))
        elif field == "encoder" and value is not None:
            setattr(project, field, value.value)
        elif value is not None:
            setattr(project, field, value)
    db.commit()
    db.refresh(project)
    images = anime_image_map(db, [project])
    return project_to_out(project, images)


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if not is_deletable(ProjectStatus(project.status)):
        raise HTTPException(400, "Cannot delete project in current status")
    release_lock_for_project(db, project_id)
    db.delete(project)
    db.commit()
    pdir = project_dir(project_id)
    if pdir.exists():
        shutil.rmtree(pdir, ignore_errors=True)
    return {"ok": True}


@router.post("/projects/{project_id}/load-themes")
def start_load_themes(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    current = ProjectStatus(project.status)
    if current == ProjectStatus.DRAFT:
        validate_transition(current, ProjectStatus.LOADING_THEMES)
        project.status = ProjectStatus.LOADING_THEMES.value
        db.commit()
    elif current != ProjectStatus.LOADING_THEMES:
        raise HTTPException(400, f"Invalid status: {current}")
    job = job_runner.start_job(project_id, JobType.LOAD_THEMES)
    return {"jobId": job.id}


@router.post("/projects/{project_id}/retry")
def retry_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if ProjectStatus(project.status) != ProjectStatus.FAILED:
        raise HTTPException(400, "Only failed projects can be retried")
    last_job = (
        db.query(Job)
        .filter(Job.project_id == project_id, Job.status == "failed")
        .order_by(Job.created_at.desc())
        .first()
    )
    stage_map = {
        JobType.LOAD_THEMES.value: ProjectStatus.LOADING_THEMES,
        JobType.SOURCE_CANDIDATES.value: ProjectStatus.SOURCING,
        JobType.DOWNLOAD.value: ProjectStatus.DOWNLOADING,
        JobType.PROBE_NORMALIZE.value: ProjectStatus.PROBING_NORMALIZING,
        JobType.CUT.value: ProjectStatus.CUTTING,
        JobType.OVERLAY.value: ProjectStatus.OVERLAYING,
        JobType.RENDER.value: ProjectStatus.RENDERING,
    }
    target = stage_map.get(last_job.type, ProjectStatus.SOURCING) if last_job else ProjectStatus.SOURCING
    project.status = target.value
    project.error_message = None
    db.commit()
    jt = job_type_for_status(target)
    if jt:
        job = job_runner.start_job(project_id, jt)
        return {"jobId": job.id, "status": target.value}
    return {"status": target.value}


@router.post("/projects/{project_id}/cancel")
def cancel_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    running_job = (
        db.query(Job)
        .filter(Job.project_id == project_id, Job.status == "running")
        .order_by(Job.created_at.desc())
        .first()
    )
    if running_job:
        job_runner.request_cancel(running_job.id)
    validate_transition(ProjectStatus(project.status), ProjectStatus.CANCELLED)
    project.status = ProjectStatus.CANCELLED.value
    db.commit()
    return {"ok": True}


@router.get("/settings", response_model=AppSettingsOut)
def get_app_settings():
    provider = settings.anime_metadata_provider
    if provider not in ("jikan", "anilist"):
        provider = "jikan"
    return AppSettingsOut(anime_metadata_provider=provider)


@router.put("/settings", response_model=AppSettingsOut)
def update_app_settings(body: AppSettingsUpdate):
    updated = save_settings({"anime_metadata_provider": body.anime_metadata_provider})
    return AppSettingsOut(anime_metadata_provider=updated.anime_metadata_provider)


@router.get("/anime/search")
async def anime_search(q: str, limit: int = 10):
    if len(q) < 2:
        return []
    results = await anime_metadata.search_anime(q, limit=limit)
    return [
        AnimeSearchResult(
            mal_id=r.get("mal_id"),
            title=r.get("title", ""),
            title_english=r.get("title_english"),
            image_url=r.get("image_url"),
            year=r.get("year"),
        )
        for r in results
        if r.get("mal_id")
    ]


@router.get("/projects/{project_id}/themes")
def list_themes(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    mal_ids = [a.anime_mal_id for a in project.animes]
    themes = db.query(ThemeSong).filter(ThemeSong.anime_mal_id.in_(mal_ids)).all()
    song_types = json.loads(project.song_types or "[]")
    themes = [t for t in themes if t.song_type in song_types]
    return [ThemeSongOut.model_validate(t) for t in themes]


@router.post("/projects/{project_id}/songs/select")
def select_songs(project_id: str, body: SongSelectRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if ProjectStatus(project.status) != ProjectStatus.SONG_SELECTION:
        raise HTTPException(400, "Not in song selection")
    if len(body.songs) != project.songs_count and not body.confirm_fewer:
        raise HTTPException(400, f"Select exactly {project.songs_count} songs or confirm fewer")

    allowed_mal_ids = {a.anime_mal_id for a in project.animes}
    allowed_song_types = set(json.loads(project.song_types or "[]"))

    db.query(Song).filter(Song.project_id == project_id).delete()
    for i, s in enumerate(body.songs):
        if s.anime_mal_id not in allowed_mal_ids:
            raise HTTPException(400, f"Anime {s.anime_mal_id} is not part of this project")
        if s.song_type.value not in allowed_song_types:
            raise HTTPException(400, f"Song type {s.song_type.value} is not enabled for this project")

        anime_name = s.anime_name
        song_type = s.song_type.value
        song_number = s.song_number
        song_title = s.song_title
        artist = s.artist
        raw_theme_text = s.raw_theme_text
        anime_mal_id = s.anime_mal_id

        if s.theme_song_id:
            theme = db.get(ThemeSong, s.theme_song_id)
            if not theme or theme.anime_mal_id not in allowed_mal_ids:
                raise HTTPException(400, f"Theme {s.theme_song_id} does not belong to project anime")
            if theme.song_type not in allowed_song_types:
                raise HTTPException(400, f"Theme song type {theme.song_type} is not enabled")
            anime_mal_id = theme.anime_mal_id
            song_type = theme.song_type
            song_number = theme.song_number
            song_title = theme.song_title
            artist = theme.artist
            raw_theme_text = theme.raw_text
            anime_name = next(
                (a.anime_name for a in project.animes if a.anime_mal_id == theme.anime_mal_id),
                anime_name,
            )

        db.add(
            Song(
                project_id=project_id,
                anime_mal_id=anime_mal_id,
                anime_name=anime_name,
                song_type=song_type,
                song_number=song_number,
                song_title=song_title,
                artist=artist,
                raw_theme_text=raw_theme_text,
                render_order=i,
            )
        )
    validate_transition(ProjectStatus.SONG_SELECTION, ProjectStatus.SOURCING)
    project.status = ProjectStatus.SOURCING.value
    db.commit()
    job = job_runner.start_job(project_id, JobType.SOURCE_CANDIDATES)
    return {"jobId": job.id}


@router.get("/projects/{project_id}/songs")
def list_songs(project_id: str, db: Session = Depends(get_db)):
    songs = db.query(Song).filter(Song.project_id == project_id).order_by(Song.render_order).all()
    return [SongOut.model_validate(s) for s in songs]


@router.get("/projects/{project_id}/songs/{song_id}/candidates")
def list_candidates(project_id: str, song_id: str, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song or song.project_id != project_id:
        raise HTTPException(404, "Song not found")
    cands = (
        db.query(SongCandidate)
        .filter(SongCandidate.song_id == song_id)
        .order_by(SongCandidate.view_count.desc().nullslast(), SongCandidate.rank)
        .all()
    )
    return [CandidateOut.model_validate(c) for c in cands]


@router.post("/projects/{project_id}/songs/{song_id}/candidates/select")
def select_candidate(
    project_id: str, song_id: str, body: CandidateSelectRequest, db: Session = Depends(get_db)
):
    song = db.get(Song, song_id)
    if not song or song.project_id != project_id:
        raise HTTPException(404, "Song not found")
    cand = db.get(SongCandidate, body.candidate_id)
    if not cand or cand.song_id != song_id:
        raise HTTPException(400, "Candidate does not belong to song")
    db.query(SongCandidate).filter(SongCandidate.song_id == song_id).update({"is_selected": False})
    cand.is_selected = True
    song.selected_candidate_id = cand.id
    song.status = SongStatus.SELECTED.value
    db.commit()
    # Check if all songs have selection
    songs = db.query(Song).filter(Song.project_id == project_id).all()
    if all(s.selected_candidate_id for s in songs):
        if ProjectStatus(db.get(Project, project_id).status) == ProjectStatus.AWAITING_CANDIDATES:
            project = db.get(Project, project_id)
            validate_transition(ProjectStatus.AWAITING_CANDIDATES, ProjectStatus.DOWNLOADING)
            project.status = ProjectStatus.DOWNLOADING.value
            db.commit()
            job = job_runner.start_job(project_id, JobType.DOWNLOAD)
            return {"ok": True, "jobId": job.id}
    return {"ok": True}


@router.post("/projects/{project_id}/stage/start")
def start_next_stage(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    status = ProjectStatus(project.status)
    jt = job_type_for_status(status)
    if not jt:
        nxt = next_auto_status_after_user_gate(status)
        if not nxt:
            raise HTTPException(400, "No automatic stage for current status")
        try:
            validate_user_gate_prerequisites(status, list(project.songs))
        except PrerequisiteError as e:
            raise HTTPException(400, str(e)) from e
        validate_transition(status, nxt)
        project.status = nxt.value
        project.error_message = None
        db.commit()
        jt = job_type_for_status(nxt)
    if not jt:
        raise HTTPException(400, "No job for status")
    job = job_runner.start_job(project_id, jt)
    return {"jobId": job.id}


@router.put("/projects/{project_id}/render-order")
def update_render_order(project_id: str, body: RenderOrderUpdate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if ProjectStatus(project.status) != ProjectStatus.AWAITING_RENDER_ORDER:
        raise HTTPException(400, "Not awaiting render order")
    if len(body.song_ids) != len(set(body.song_ids)):
        raise HTTPException(400, "Duplicate song ids")
    songs = db.query(Song).filter(Song.project_id == project_id).all()
    if len(body.song_ids) != len(songs):
        raise HTTPException(400, "Must include all songs")
    song_map = {s.id: s for s in songs}
    for sid in body.song_ids:
        if sid not in song_map:
            raise HTTPException(400, f"Unknown song {sid}")
    # Two-phase update avoids UNIQUE(project_id, render_order) violations during swaps.
    for i, song in enumerate(songs):
        song.render_order = -(i + 1)
    db.flush()
    for i, sid in enumerate(body.song_ids):
        song_map[sid].render_order = i
    db.commit()
    return {"ok": True}


@router.post("/projects/{project_id}/render-again")
def render_again(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    current = ProjectStatus(project.status)
    if current != ProjectStatus.COMPLETED:
        raise HTTPException(400, "Only completed projects can be re-rendered")
    songs = sorted(project.songs, key=lambda s: s.render_order)
    if not songs:
        raise HTTPException(400, "Project has no songs")
    missing = [
        s.song_title
        for s in songs
        if not s.overlayed_clip_path or not Path(s.overlayed_clip_path).exists()
    ]
    if missing:
        raise HTTPException(400, f"Missing overlay clips for: {', '.join(missing)}")
    validate_transition(current, ProjectStatus.RENDERING)
    project.status = ProjectStatus.RENDERING.value
    project.error_message = None
    db.commit()
    job = job_runner.start_job(project_id, JobType.RENDER)
    return {"jobId": job.id}


@router.post("/projects/{project_id}/render-order/confirm")
def confirm_render_order(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if ProjectStatus(project.status) != ProjectStatus.AWAITING_RENDER_ORDER:
        raise HTTPException(400, "Not awaiting render order")
    validate_transition(ProjectStatus.AWAITING_RENDER_ORDER, ProjectStatus.RENDERING)
    project.status = ProjectStatus.RENDERING.value
    db.commit()
    job = job_runner.start_job(project_id, JobType.RENDER)
    return {"jobId": job.id}


@router.get("/projects/{project_id}/jobs")
def list_jobs(project_id: str, db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.project_id == project_id).order_by(Job.created_at.desc()).all()
    return [JobOut.model_validate(j) for j in jobs]


@router.get("/projects/{project_id}/logs")
def project_logs(project_id: str, limit: int = 300, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    logs = (
        db.query(JobLog)
        .join(Job, JobLog.job_id == Job.id)
        .filter(Job.project_id == project_id)
        .order_by(JobLog.created_at.desc())
        .limit(limit)
        .all()
    )
    logs.reverse()
    return [JobLogOut.model_validate(l) for l in logs]


@router.get("/jobs/{job_id}/logs")
def job_logs(job_id: str, db: Session = Depends(get_db)):
    logs = db.query(JobLog).filter(JobLog.job_id == job_id).order_by(JobLog.created_at).all()
    return [JobLogOut.model_validate(l) for l in logs]


@router.get("/projects/{project_id}/output")
def get_output(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    output_path = project.output_path
    filename = Path(output_path).name if output_path else None
    return {
        "status": project.status,
        "output_path": output_path,
        "output_filename": filename,
        "exists": bool(output_path and Path(output_path).exists()),
    }


@router.get("/projects/{project_id}/output/download")
def download_output(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project or not project.output_path or not Path(project.output_path).exists():
        raise HTTPException(404, "Output not found")
    return FileResponse(project.output_path, media_type="video/mp4", filename=Path(project.output_path).name)


@router.post("/projects/{project_id}/output/open-folder")
def open_output_folder(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project or not project.output_path:
        raise HTTPException(404, "No output")
    folder = str(Path(project.output_path).parent)
    import subprocess
    import sys

    if sys.platform == "linux":
        subprocess.Popen(["xdg-open", folder])
    elif sys.platform == "darwin":
        subprocess.Popen(["open", folder])
    elif sys.platform == "win32":
        subprocess.Popen(["explorer", folder])
    return {"folder": folder}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
