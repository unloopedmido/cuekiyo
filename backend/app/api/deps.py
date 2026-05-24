import json

from sqlalchemy.orm import Session

from app.models import AnimeCache, Project


def anime_image_map(db: Session, projects: list[Project]) -> dict[int, str | None]:
    mal_ids = {a.anime_mal_id for p in projects for a in p.animes}
    if not mal_ids:
        return {}
    rows = (
        db.query(AnimeCache.mal_id, AnimeCache.image_url)
        .filter(AnimeCache.mal_id.in_(mal_ids))
        .all()
    )
    return {mal_id: image_url for mal_id, image_url in rows}


def project_to_out(
    project: Project, image_map: dict[int, str | None] | None = None
) -> dict:
    images = image_map or {}
    return {
        "id": project.id,
        "title": project.title,
        "status": project.status,
        "songs_count": project.songs_count,
        "song_types": json.loads(project.song_types or "[]"),
        "clip_time": project.clip_time,
        "target_width": project.target_width,
        "target_height": project.target_height,
        "target_fps": project.target_fps,
        "target_aspect_ratio": project.target_aspect_ratio,
        "encoder": project.encoder,
        "audio_normalize": project.audio_normalize,
        "source_mode": project.source_mode,
        "overlay_config": json.loads(project.overlay_config_json or "{}"),
        "fade_seconds": project.fade_seconds,
        "unlimited_songs": project.unlimited_songs,
        "output_path": project.output_path,
        "error_message": project.error_message,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "animes": [
            {
                "anime_mal_id": a.anime_mal_id,
                "anime_name": a.anime_name,
                "display_order": a.display_order,
                "image_url": images.get(a.anime_mal_id),
            }
            for a in project.animes
        ],
    }
