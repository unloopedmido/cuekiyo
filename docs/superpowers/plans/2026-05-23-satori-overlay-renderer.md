# Satori Overlay Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace FFmpeg `drawtext`/`drawbox` overlays with Satori-rendered PNG lower-thirds, composited per clip during the OVERLAY stage; final render only concatenates pre-composited clips.

**Architecture:** A Node CLI (`frontend/scripts/render-overlay.mjs`) uses Satori + resvg to render one RGBA PNG per song from JSON payload. Python `overlay_renderer` builds content, invokes the CLI, then `ffmpeg_engine.build_png_overlay_cmd` composites PNG onto the clean clip into `overlayed/{song_id}_overlay.mp4`. Render stage uses `build_concat_render_cmd` (no burn-in filters).

**Tech Stack:** Satori, @resvg/resvg-js, Node 24, FFmpeg overlay filter, existing NVENC/libx264 encode path

---

### Task 1: Node overlay renderer

**Files:**
- Create: `frontend/scripts/render-overlay.mjs`
- Modify: `frontend/package.json`

- [ ] Add `satori` and `@resvg/resvg-js` dependencies
- [ ] CLI reads JSON payload path from argv, writes PNG matching current lower-third design (scaled to target height)
- [ ] `npm run render-overlay -- payload.json` script entry

### Task 2: Python overlay service

**Files:**
- Modify: `backend/app/services/overlay_renderer.py`
- Modify: `backend/app/services/ffmpeg_engine.py`

- [ ] `render_overlay_png()` subprocess to Node CLI
- [ ] `build_png_overlay_filter()` / `build_png_overlay_cmd()` for FFmpeg compositing
- [ ] `check_overlay_support()` checks Node, deps, ffmpeg overlay filter, fonts (not drawtext)

### Task 3: Pipeline integration

**Files:**
- Modify: `backend/app/jobs/runner.py`

- [ ] OVERLAY stage: render PNG + composite to `song_overlayed_path`; skip when valid overlay clip exists
- [ ] RENDER stage: use `build_concat_render_cmd` on pre-composited clips

### Task 4: Tests and docs

**Files:**
- Modify: `backend/tests/test_overlay_renderer.py`
- Modify: `backend/tests/test_stage_resume.py`
- Modify: `backend/tests/test_ffmpeg_quality.py`
- Create: `backend/tests/test_png_overlay.py`
- Modify: `README.md`

- [ ] Update/remove drawtext-specific tests
- [ ] Add PNG overlay filter and render-overlay tests
- [ ] Run `pytest` and overlay CLI smoke test
