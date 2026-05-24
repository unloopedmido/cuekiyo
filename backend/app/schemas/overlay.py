import json
from typing import Literal

from pydantic import BaseModel


class OverlayConfig(BaseModel):
    enabled: bool = True
    style: Literal["default", "minimal"] = "default"
    position: Literal["bottom", "top"] = "bottom"
    show_anime_name: bool = True
    show_song_line: bool = True
    show_meta_line: bool = True


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
