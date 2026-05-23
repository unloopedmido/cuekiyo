from typing import Literal

from pydantic import BaseModel, field_validator


class AppSettingsOut(BaseModel):
    anime_metadata_provider: Literal["jikan", "anilist"]


class AppSettingsUpdate(BaseModel):
    anime_metadata_provider: Literal["jikan", "anilist"]

    @field_validator("anime_metadata_provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        if value not in ("jikan", "anilist"):
            raise ValueError("anime_metadata_provider must be 'jikan' or 'anilist'")
        return value
