from app.schemas.overlay import OverlayConfig, overlay_config_from_json, overlay_config_to_json


def test_overlay_config_defaults_match_current_behavior():
    cfg = OverlayConfig()
    assert cfg.enabled is True
    assert cfg.style == "default"
    assert cfg.position == "bottom"
    assert cfg.show_anime_name is True
    assert cfg.show_song_line is True
    assert cfg.show_meta_line is True


def test_overlay_config_roundtrip():
    raw = overlay_config_to_json(OverlayConfig(enabled=False, style="minimal"))
    cfg = overlay_config_from_json(raw)
    assert cfg.enabled is False
    assert cfg.style == "minimal"
