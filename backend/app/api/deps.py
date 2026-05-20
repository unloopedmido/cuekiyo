import json

from app.models import Project


def project_to_out(project: Project) -> dict:
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
        "output_path": project.output_path,
        "error_message": project.error_message,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "animes": [
            {
                "anime_mal_id": a.anime_mal_id,
                "anime_name": a.anime_name,
                "display_order": a.display_order,
            }
            for a in project.animes
        ],
    }
