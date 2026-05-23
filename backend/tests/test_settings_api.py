import pytest

from app import config


def test_save_settings_persists_anime_provider(monkeypatch, tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    monkeypatch.setattr(config, "_DEFAULT_DATA_DIR", data_dir)
    monkeypatch.setenv("PIPELINE_DATA_DIR", str(data_dir))

    loaded = config.load_settings()
    monkeypatch.setattr(config, "settings", loaded)

    updated = config.save_settings({"anime_metadata_provider": "anilist"})

    assert updated.anime_metadata_provider == "anilist"
    settings_path = data_dir / "settings.json"
    assert settings_path.exists()
    reloaded = config.load_settings()
    assert reloaded.anime_metadata_provider == "anilist"
