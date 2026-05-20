from pydantic import BaseModel

from app.enums import SongType


class AnimeSearchResult(BaseModel):
    mal_id: int
    title: str
    title_english: str | None = None
    image_url: str | None = None
    year: int | None = None


class ThemeSongOut(BaseModel):
    id: str
    anime_mal_id: int
    song_type: SongType
    song_number: int
    song_title: str
    artist: str | None
    raw_text: str

    model_config = {"from_attributes": True}
