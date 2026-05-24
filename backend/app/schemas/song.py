import json
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.enums import SongType


class SongSelectItem(BaseModel):
    theme_song_id: str | None = None
    anime_mal_id: int
    anime_name: str
    song_type: SongType
    song_number: int
    song_title: str
    artist: str | None = None
    raw_theme_text: str


class SongSelectRequest(BaseModel):
    songs: list[SongSelectItem]
    confirm_fewer: bool = False


class ManualCandidateRequest(BaseModel):
    url: str = Field(min_length=1, max_length=512)


class CandidateOut(BaseModel):
    id: str
    song_id: str
    youtube_id: str
    url: str
    title: str
    uploader_name: str | None
    view_count: int | None
    duration: float | None
    thumbnail_url: str | None
    score: float
    rank: int
    is_selected: bool
    is_manual: bool
    rejection_flags: list[str]

    @field_validator("rejection_flags", mode="before")
    @classmethod
    def parse_rejection_flags(cls, value: object) -> list[str]:
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                return []
        if value is None:
            return []
        return value  # type: ignore[return-value]

    model_config = {"from_attributes": True}


class CandidateSelectRequest(BaseModel):
    candidate_id: str


class SongClipUpdate(BaseModel):
    cut_start_time: float | None = Field(default=None, ge=0.0)
    clip_time: float | None = Field(default=None, ge=1.0, le=120.0)


class SongOut(BaseModel):
    id: str
    project_id: str
    anime_mal_id: int
    anime_name: str
    song_type: str
    song_number: int
    song_title: str
    artist: str | None
    selected_candidate_id: str | None
    render_order: int
    status: str
    cut_start_time: float | None
    cut_end_time: float | None

    model_config = {"from_attributes": True}
