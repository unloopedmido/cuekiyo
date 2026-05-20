from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AMV_")

    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"
    db_path: Path | None = None
    jikan_base_url: str = "https://api.jikan.moe/v4"
    jikan_rate_limit_seconds: float = 0.35
    transition_seconds: float = 0.5
    fade_seconds: float = 0.5
    candidate_count: int = 3
    ws_heartbeat_seconds: int = 30
    stale_lock_seconds: int = 120

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


settings = Settings()
