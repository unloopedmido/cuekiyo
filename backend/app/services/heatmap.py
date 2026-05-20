def highest_average_window(
    points: list[tuple[float, float]],
    window_length: float,
    video_duration: float,
) -> tuple[float, float]:
    """
    Find start/end for the window of length window_length with highest average heat.
    points: (timestamp, value)
    """
    if video_duration <= 0:
        return 0.0, 0.0

    if video_duration <= window_length:
        return 0.0, video_duration

    if not points:
        mid = max(0.0, video_duration * 0.45)
        end = min(video_duration, mid + window_length)
        return mid, end

    # Build simple timeline samples
    sorted_pts = sorted(points, key=lambda p: p[0])
    best_start = 0.0
    best_avg = -1.0
    step = 0.5
    t = 0.0
    while t + window_length <= video_duration:
        window_end = t + window_length
        in_window = [v for ts, v in sorted_pts if t <= ts < window_end]
        avg = sum(in_window) / len(in_window) if in_window else 0.0
        if avg > best_avg:
            best_avg = avg
            best_start = t
        t += step

    if best_avg <= 0:
        mid = video_duration * 0.45
        if mid + window_length > video_duration:
            mid = video_duration * 0.30
        return mid, min(video_duration, mid + window_length)

    return best_start, min(video_duration, best_start + window_length)
