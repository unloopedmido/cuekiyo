import os
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TypeVar

from app.config import settings

T = TypeVar("T")
R = TypeVar("R")


class ParallelProgress:
    def __init__(self, initial: int = 0) -> None:
        self._lock = threading.Lock()
        self.completed = initial

    def increment(self) -> int:
        with self._lock:
            self.completed += 1
            return self.completed


def resolve_ffmpeg_workers(encoder: str) -> int:
    if settings.ffmpeg_workers > 0:
        return settings.ffmpeg_workers
    if "nvenc" in encoder:
        return 1
    return max(1, min(4, (os.cpu_count() or 4) // 2))


def run_parallel(
    items: list[T],
    worker: Callable[[T], R],
    *,
    max_workers: int,
    cancel_check: Callable[[], None] | None = None,
    on_complete: Callable[[T, R], None] | None = None,
) -> None:
    if not items:
        return

    workers = max(1, min(max_workers, len(items)))
    if workers == 1:
        for item in items:
            if cancel_check:
                cancel_check()
            result = worker(item)
            if on_complete:
                on_complete(item, result)
        return

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(worker, item): item for item in items}
        try:
            for future in as_completed(futures):
                if cancel_check:
                    cancel_check()
                item = futures[future]
                result = future.result()
                if on_complete:
                    on_complete(item, result)
        except BaseException:
            for future in futures:
                future.cancel()
            raise
