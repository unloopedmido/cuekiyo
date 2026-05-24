import json
import os
from pathlib import Path

from pydantic import BaseModel

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_DATA_DIR = _REPO_ROOT / "data"
_ENV_FILE = _REPO_ROOT / ".env"


def _load_dotenv() -> None:
    if not _ENV_FILE.exists():
        return
    for line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ[key] = value


def _env_str(key: str) -> str | None:
    value = os.environ.get(key)
    if value is None or value.strip() == "":
        return None
    return value.strip()


class Settings(BaseModel):
    data_dir: Path = _DEFAULT_DATA_DIR
    db_path: Path | None = None
    anime_metadata_provider: str = "jikan"
    jikan_base_url: str = "https://api.jikan.moe/v4"
    jikan_rate_limit_seconds: float = 0.35
    anilist_graphql_url: str = "https://graphql.anilist.co"
    anilist_rate_limit_seconds: float = 0.7
    fade_seconds: float = 0.5
    ffmpeg_crf: int = 18
    ffmpeg_cq: int = 19
    candidate_count: int = 3
    youtube_workers: int = 2
    ffmpeg_workers: int = 0
    ws_heartbeat_seconds: int = 30
    stale_lock_seconds: int = 120
    serve_frontend: bool = False

    @property
    def database_url(self) -> str:
        path = (self.db_path or (self.data_dir / "pipeline.db")).resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{path.as_posix()}"

    @property
    def projects_dir(self) -> Path:
        d = self.data_dir / "projects"
        d.mkdir(parents=True, exist_ok=True)
        return d


def settings_file(data_dir: Path | None = None) -> Path:
    return (data_dir or _DEFAULT_DATA_DIR) / "settings.json"


def _load_legacy_json() -> dict | None:
    for candidate_dir in (_DEFAULT_DATA_DIR,):
        path = settings_file(candidate_dir)
        if not path.exists():
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        if "data_dir" in raw:
            raw["data_dir"] = Path(raw["data_dir"])
        if raw.get("db_path"):
            raw["db_path"] = Path(raw["db_path"])
        return raw
    return None


def _apply_env_overrides(data: dict) -> dict:
    env_map: list[tuple[str, str, type]] = [
        ("PIPELINE_DATA_DIR", "data_dir", Path),
        ("PIPELINE_DB_PATH", "db_path", Path),
        ("PIPELINE_ANIME_METADATA_PROVIDER", "anime_metadata_provider", str),
        ("PIPELINE_JIKAN_BASE_URL", "jikan_base_url", str),
        ("PIPELINE_JIKAN_RATE_LIMIT_SECONDS", "jikan_rate_limit_seconds", float),
        ("PIPELINE_ANILIST_GRAPHQL_URL", "anilist_graphql_url", str),
        ("PIPELINE_ANILIST_RATE_LIMIT_SECONDS", "anilist_rate_limit_seconds", float),
        ("PIPELINE_FADE_SECONDS", "fade_seconds", float),
        ("PIPELINE_FFMPEG_CRF", "ffmpeg_crf", int),
        ("PIPELINE_FFMPEG_CQ", "ffmpeg_cq", int),
        ("PIPELINE_CANDIDATE_COUNT", "candidate_count", int),
        ("PIPELINE_YOUTUBE_WORKERS", "youtube_workers", int),
        ("PIPELINE_FFMPEG_WORKERS", "ffmpeg_workers", int),
        ("PIPELINE_WS_HEARTBEAT_SECONDS", "ws_heartbeat_seconds", int),
        ("PIPELINE_STALE_LOCK_SECONDS", "stale_lock_seconds", int),
        ("PIPELINE_SERVE_FRONTEND", "serve_frontend", bool),
    ]
    for env_key, field, cast in env_map:
        raw = _env_str(env_key)
        if raw is None:
            continue
        if cast is bool:
            data[field] = raw.lower() in ("1", "true", "yes", "on")
        else:
            data[field] = cast(raw) if cast is not str else raw
    return data


def load_settings() -> Settings:
    _load_dotenv()
    legacy = _load_legacy_json()
    if legacy:
        data = legacy
    else:
        data = Settings(data_dir=_DEFAULT_DATA_DIR).model_dump()
    data = _apply_env_overrides(data)
    return Settings.model_validate(data)


def _settings_to_json(data: dict) -> dict:
    out = dict(data)
    if isinstance(out.get("data_dir"), Path):
        out["data_dir"] = out["data_dir"].as_posix()
    if isinstance(out.get("db_path"), Path):
        out["db_path"] = out["db_path"].as_posix()
    return out


def save_settings(updates: dict) -> Settings:
    global settings
    path = settings_file(settings.data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        stored = json.loads(path.read_text(encoding="utf-8"))
    else:
        stored = _settings_to_json(settings.model_dump())
    stored.update(updates)
    path.write_text(json.dumps(stored, indent=2), encoding="utf-8")
    settings = load_settings()
    return settings


settings = load_settings()
