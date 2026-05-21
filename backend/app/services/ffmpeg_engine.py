import json
import shutil
import subprocess
import time
from collections.abc import Callable
from pathlib import Path

from app.config import settings
from app.enums import Encoder
from app.exceptions import CancelledJob

_NVENC_PROBE_CACHE: dict[str, bool] = {}


def check_binary(name: str) -> tuple[bool, str]:
    path = shutil.which(name)
    if path:
        return True, path
    return False, f"{name} not found in PATH"


def _encoder_listed(encoder: str) -> bool:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-encoders"],
        capture_output=True,
        text=True,
        check=False,
    )
    return encoder in proc.stdout


def _nvenc_usable(encoder: str) -> bool:
    if encoder in _NVENC_PROBE_CACHE:
        return _NVENC_PROBE_CACHE[encoder]
    if not _encoder_listed(encoder):
        _NVENC_PROBE_CACHE[encoder] = False
        return False
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=64x64:d=0.1",
        "-c:v",
        encoder,
        "-f",
        "null",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    usable = proc.returncode == 0
    _NVENC_PROBE_CACHE[encoder] = usable
    return usable


def detect_encoder(requested: Encoder) -> str:
    if requested == Encoder.LIBX264:
        return "libx264"
    if requested == Encoder.H264_NVENC:
        return "h264_nvenc" if _nvenc_usable("h264_nvenc") else "libx264"
    if requested == Encoder.HEVC_NVENC:
        return "hevc_nvenc" if _nvenc_usable("hevc_nvenc") else "libx264"
    ok, _ = check_binary("ffmpeg")
    if not ok:
        return "libx264"
    if _nvenc_usable("h264_nvenc"):
        return "h264_nvenc"
    return "libx264"


def ffprobe_json(path: str | Path) -> dict:
    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {proc.stderr}")
    return json.loads(proc.stdout)


def has_audio_stream(path: str | Path) -> bool:
    data = ffprobe_json(path)
    return any(s.get("codec_type") == "audio" for s in data.get("streams") or [])


def is_valid_media(path: str | Path) -> bool:
    try:
        data = ffprobe_json(path)
        streams = data.get("streams") or []
        has_video = any(s.get("codec_type") == "video" for s in streams)
        return has_video and Path(path).exists() and Path(path).stat().st_size > 0
    except (RuntimeError, json.JSONDecodeError, OSError):
        return False


def build_normalize_cmd(
    input_path: Path,
    output_path: Path,
    width: int,
    height: int,
    fps: int,
    video_encoder: str,
) -> list[str]:
    vf = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,"
        f"fps={fps},format=yuv420p"
    )
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-vf",
        vf,
        "-c:v",
        video_encoder,
        "-preset",
        "fast" if "nvenc" in video_encoder else "medium",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "192k",
        str(output_path),
    ]


def build_cut_cmd(
    input_path: Path,
    output_path: Path,
    start: float,
    duration: float,
    audio_normalize: bool,
    video_encoder: str,
) -> list[str]:
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start),
        "-i",
        str(input_path),
        "-t",
        str(duration),
        "-c:v",
        video_encoder,
        "-preset",
        "fast" if "nvenc" in video_encoder else "medium",
    ]
    if audio_normalize:
        cmd.extend(["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"])
    cmd.extend(["-c:a", "aac", "-ar", "48000", "-ac", "2", str(output_path)])
    return cmd


def build_overlay_cmd(
    input_path: Path,
    output_path: Path,
    video_encoder: str,
    video_filter: str,
) -> list[str]:
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-filter_complex",
        video_filter,
        "-map",
        "[v]",
        "-map",
        "0:a?",
        "-c:v",
        video_encoder,
        "-preset",
        "fast" if "nvenc" in video_encoder else "medium",
        "-c:a",
        "copy",
        str(output_path),
    ]


def build_silent_audio_cmd(input_path: Path, output_path: Path) -> list[str]:
    """Add a stereo silent audio track when the clip has video but no audio."""
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        str(output_path),
    ]


def ensure_audio_clip(clip_path: Path, work_dir: Path) -> Path:
    if has_audio_stream(clip_path):
        return clip_path
    work_dir.mkdir(parents=True, exist_ok=True)
    out = work_dir / f"{clip_path.stem}_with_audio.mp4"
    if out.exists() and is_valid_media(out) and has_audio_stream(out):
        return out
    run_ffmpeg(build_silent_audio_cmd(clip_path, out))
    return out


def build_concat_render_cmd(
    clip_paths: list[Path],
    output_path: Path,
    fade_seconds: float,
    video_encoder: str,
) -> list[str]:
    """Concatenate with xfade/acrossfade between clips."""
    for clip in clip_paths:
        if not has_audio_stream(clip):
            raise RuntimeError(f"Clip missing audio stream: {clip.name}")

    if len(clip_paths) == 1:
        return ["ffmpeg", "-y", "-i", str(clip_paths[0]), "-c", "copy", str(output_path)]

    inputs: list[str] = []
    for p in clip_paths:
        inputs.extend(["-i", str(p)])

    meta = ffprobe_json(clip_paths[0])
    dur = float(meta.get("format", {}).get("duration", 10))
    transition = min(fade_seconds, dur / 4)

    n = len(clip_paths)
    filter_parts: list[str] = []
    prev = "[0:v]"
    offset = dur - transition
    for i in range(1, n):
        out = f"[v{i}]" if i < n - 1 else "[vout]"
        filter_parts.append(
            f"{prev}[{i}:v]xfade=transition=fade:duration={transition}:offset={offset}{out}"
        )
        prev = out
        if i < n - 1:
            meta_i = ffprobe_json(clip_paths[i])
            offset += float(meta_i.get("format", {}).get("duration", dur)) - transition

    prev_a = "[0:a]"
    for i in range(1, n):
        out_a = f"[a{i}]" if i < n - 1 else "[aout]"
        filter_parts.append(f"{prev_a}[{i}:a]acrossfade=d={transition}{out_a}")
        prev_a = out_a

    filter_complex = ";".join(filter_parts)
    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filter_complex, "-map", "[vout]", "-map", "[aout]"]
    cmd.extend(
        [
            "-c:v",
            video_encoder,
            "-preset",
            "fast" if "nvenc" in video_encoder else "medium",
            "-c:a",
            "aac",
            str(output_path),
        ]
    )
    return cmd


def _swap_encoder(cmd: list[str], fallback: str) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(cmd):
        if cmd[i] == "-c:v" and i + 1 < len(cmd):
            out.extend(["-c:v", fallback])
            i += 2
            continue
        out.append(cmd[i])
        i += 1
    return out


def run_ffmpeg(
    cmd: list[str],
    *,
    log_fn: Callable[[str], None] | None = None,
    cancel_check: Callable[[], bool] | None = None,
    encoder_fallback: str | None = "libx264",
) -> None:
    """Run ffmpeg with argument list (no shell)."""
    if cmd and cmd[0] != "ffmpeg":
        raise ValueError("Only ffmpeg commands allowed")

    def _execute(run_cmd: list[str]) -> subprocess.CompletedProcess[str]:
        proc = subprocess.Popen(
            run_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        while proc.poll() is None:
            if cancel_check and cancel_check():
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()
                raise CancelledJob()
            time.sleep(0.25)
        stdout, stderr = proc.communicate()
        return subprocess.CompletedProcess(run_cmd, proc.returncode, stdout, stderr)

    proc = _execute(cmd)
    combined = (proc.stderr or proc.stdout or "").strip()
    if log_fn and combined:
        log_fn(combined)

    if proc.returncode != 0:
        uses_nvenc = any("nvenc" in part for part in cmd)
        if uses_nvenc and encoder_fallback and encoder_fallback not in cmd:
            fallback_cmd = _swap_encoder(cmd, encoder_fallback)
            proc = _execute(fallback_cmd)
            combined = (proc.stderr or proc.stdout or "").strip()
            if log_fn and combined:
                log_fn(f"[fallback {encoder_fallback}] {combined}")
        if proc.returncode != 0:
            raise RuntimeError(combined or "ffmpeg failed")
