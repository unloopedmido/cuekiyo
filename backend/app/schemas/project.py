from pydantic import BaseModel, Field

from app.enums import Encoder, SongType, SourceMode
from app.schemas.overlay import OverlayConfig


class ProjectAnimeIn(BaseModel):
    anime_mal_id: int
    anime_name: str
    display_order: int = 0
    image_url: str | None = None


class ProjectCreate(BaseModel):
    title: str
    animes: list[ProjectAnimeIn]
    songs_count: int = Field(default=5, ge=1, le=50)
    song_types: list[SongType] = [SongType.OPENING]
    clip_time: float = Field(default=10.0, ge=1.0, le=120.0)
    target_width: int = 1920
    target_height: int = 1080
    target_fps: int = 24
    target_aspect_ratio: str = "16:9"
    encoder: Encoder = Encoder.AUTO
    audio_normalize: bool = True
    source_mode: SourceMode = SourceMode.AUTO
    overlay_config: OverlayConfig | None = None


class ProjectUpdate(BaseModel):
    title: str | None = None
    songs_count: int | None = Field(default=None, ge=1, le=50)
    song_types: list[SongType] | None = None
    clip_time: float | None = Field(default=None, ge=1.0, le=120.0)
    target_width: int | None = None
    target_height: int | None = None
    target_fps: int | None = None
    target_aspect_ratio: str | None = None
    encoder: Encoder | None = None
    audio_normalize: bool | None = None
    source_mode: SourceMode | None = None
    overlay_config: OverlayConfig | None = None


class ProjectAnimeOut(BaseModel):
    anime_mal_id: int
    anime_name: str
    display_order: int
    image_url: str | None = None

    model_config = {"from_attributes": True}


class RenderOrderUpdate(BaseModel):
    song_ids: list[str]
