import threading
import time

import pytest

from app.config import settings
from app.exceptions import CancelledJob
from app.jobs.parallel import ParallelProgress, resolve_ffmpeg_workers, run_parallel
from app.services import youtube_sourcer


def test_parallel_progress_is_thread_safe():
    progress = ParallelProgress()
    seen: list[int] = []

    def worker(_: int) -> None:
        seen.append(progress.increment())

    run_parallel(list(range(20)), worker, max_workers=4, on_complete=lambda _i, _r: None)
    assert sorted(seen) == list(range(1, 21))


def test_run_parallel_respects_max_workers():
    lock = threading.Lock()
    active = 0
    peak = 0

    def worker(_: int) -> int:
        nonlocal active, peak
        with lock:
            active += 1
            peak = max(peak, active)
        time.sleep(0.05)
        with lock:
            active -= 1
        return 1

    run_parallel(list(range(8)), worker, max_workers=2)
    assert peak <= 2


def test_run_parallel_single_worker_runs_inline():
    order: list[int] = []

    def worker(item: int) -> int:
        order.append(item)
        return item

    def on_complete(item: int, result: int) -> None:
        assert item == result

    run_parallel([1, 2, 3], worker, max_workers=1, on_complete=on_complete)
    assert order == [1, 2, 3]


def test_run_parallel_cancel_check():
    calls = {"count": 0}

    def cancel_check() -> None:
        calls["count"] += 1
        if calls["count"] > 1:
            raise CancelledJob()

    def worker(item: int) -> int:
        time.sleep(0.05)
        return item

    with pytest.raises(CancelledJob):
        run_parallel(list(range(6)), worker, max_workers=2, cancel_check=cancel_check)


def test_resolve_ffmpeg_workers_nvenc_defaults_to_one(monkeypatch):
    monkeypatch.setattr(settings, "ffmpeg_workers", 0)
    assert resolve_ffmpeg_workers("h264_nvenc") == 1


def test_resolve_ffmpeg_workers_explicit_override(monkeypatch):
    monkeypatch.setattr(settings, "ffmpeg_workers", 3)
    assert resolve_ffmpeg_workers("h264_nvenc") == 3


def test_resolve_ffmpeg_workers_libx264_uses_cpu_budget(monkeypatch):
    monkeypatch.setattr(settings, "ffmpeg_workers", 0)
    workers = resolve_ffmpeg_workers("libx264")
    assert 1 <= workers <= 4


def test_youtube_slot_limits_concurrency(monkeypatch):
    monkeypatch.setattr(settings, "youtube_workers", 1)
    youtube_sourcer._youtube_semaphore = None

    lock = threading.Lock()
    active = 0
    peak = 0

    def hold_slot() -> None:
        nonlocal active, peak
        with youtube_sourcer.youtube_slot():
            with lock:
                active += 1
                peak = max(peak, active)
            time.sleep(0.05)
            with lock:
                active -= 1

    threads = [threading.Thread(target=hold_slot) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert peak == 1
