from app.jobs.runner import _compute_clip_window


def test_prepare_uses_user_start_and_duration():
    start, duration = _compute_clip_window(
        video_duration=180.0,
        clip_time=10.0,
        song_clip_time=12.0,
        cut_start_time=30.0,
        heatmap_points=None,
    )
    assert start == 30.0
    assert duration == 12.0


def test_prepare_falls_back_to_heatmap_when_no_user_start():
    heat = [(0.0, 0.1), (60.0, 0.9), (120.0, 0.2)]
    start, duration = _compute_clip_window(
        video_duration=180.0,
        clip_time=10.0,
        song_clip_time=None,
        cut_start_time=None,
        heatmap_points=heat,
    )
    assert 50.0 <= start <= 70.0
    assert duration == 10.0
