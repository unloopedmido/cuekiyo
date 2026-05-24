import json
from typing import Literal

from pydantic import BaseModel, Field


class OverlayConfig(BaseModel):
    enabled: bool = True
    style: Literal["default", "minimal"] = "default"
    position: Literal["bottom", "top"] = "bottom"
    show_anime_name: bool = True
    show_song_line: bool = True
    show_meta_line: bool = True


class OverlayPreviewRequest(BaseModel):
    width: int = Field(default=1920, ge=640, le=3840)
    height: int = Field(default=1080, ge=360, le=2160)
    anime_name: str = "Sample Anime"
    song_line: str = "OP1: Sample Song"
    meta_line: str = "12,345 views · Sample Uploader"
    config: OverlayConfig = Field(default_factory=OverlayConfig)


def overlay_config_from_json(raw: str | None) -> OverlayConfig:
    if not raw:
        return OverlayConfig()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return OverlayConfig()
    return OverlayConfig.model_validate(data)


def overlay_config_to_json(config: OverlayConfig) -> str:
    return json.dumps(config.model_dump())
