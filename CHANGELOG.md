# Changelog

All notable changes to Cuekiyo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-05-24

The first public release of Cuekiyo: a local-first studio for building anime opening and ending compilations.

### Highlights

- One-shot pipeline from anime picks to finished MP4, pausing only at user-gated checkpoints (song selection, candidate review, optional clip trim, render order).
- Local-only by design — SQLite, file-based projects under `data/projects/{id}/`, no cloud or paid services.
- React 19 SPA with view transitions, OKLCH theming, glass surfaces, and direction-aware navigation animations.

### Pipeline

- Strict state machine in `state_machine.py` with validated transitions and three user-gated statuses (`SONG_SELECTION`, `AWAITING_CANDIDATES`, `AWAITING_RENDER_ORDER`).
- Optional `AWAITING_CLIP_TRIM` gate with per-song `clip_start_seconds` and `clip_duration_seconds`.
- Auto-continue: on user-gate resolution, the next stage job kicks off automatically.
- Auto-recovery: `JobRunner` heartbeat + `AppLock` row clears stale locks after `PIPELINE_STALE_LOCK_SECONDS`.
- Cancellation via per-job cancel flags and CANCELLED terminal status.

### Sourcing & media

- YouTube candidate search and ranked scoring with manual override per song.
- Manual source mode: skip auto-sourcing entirely and paste your own YouTube URLs (with metadata fetch + thumbnail preview).
- YouTube heatmap analysis to pick the visually interesting clip start time, with deterministic fallback.
- `yt-dlp` download with subprocess argument lists (no shell concatenation).
- FFmpeg pipeline: probe, normalize, cut, overlay, render with NVENC auto-detection and transparent `libx264` fallback.
- Configurable crossfade duration; 0s passthrough supported.
- Per-song clip download endpoint and ZIP export of all clips.
- Reprocess overlay or final render without re-downloading sources.

### Metadata

- Unified anime metadata interface delegating to Jikan (MyAnimeList) or AniList GraphQL with provider fallback.
- Theme song parser extracts opening/ending titles from Jikan data.
- Bulk anime list import from MyAnimeList.
- Both providers rate-limited via configurable `PIPELINE_*_RATE_LIMIT_SECONDS`.

### Overlay rendering

- HTML-to-PNG lower-third overlay via Satori (Node.js) composited with ffmpeg.
- Style and position variants (default / minimal, top / bottom).
- Live overlay preview API and customization UI.
- Disable-overlay passthrough.

### Project management

- Named project templates saved in browser storage.
- Duplicate project as new draft.
- Edit draft settings in UI.
- "Render again" / "reapply overlay" actions exposed in UI.
- Unlimited songs mode with backend validation.
- "Select all" / "deselect all" theme song picker actions.
- Bulk anime import UI on project setup.
- Embedded YouTube preview in source selection.

### Frontend

- React 19, Vite 8, Tailwind v4 (CSS-first), shadcn/ui (radix-mira), HugeIcons, React Router v7, `@dnd-kit`.
- View transitions: forward/back direction-aware page transitions, morphing project thumbnail and title across pages.
- Command palette (Cmd+K) with global keyboard shortcuts.
- Visibility-aware polling via `usePolling` hook plus WebSocket live progress.
- Dark/light/system theme with OKLCH-derived accents from a single `--primary` token.
- Reduced-motion support across all animations and view transitions.
- Legal gate and onboarding tour.
- Binary availability alerts with install hints (`/api/system/binaries`).

### Tooling

- GitHub Actions CI: backend pytest (Python 3.14) + frontend `npm test` + Vite build (Node 24).
- Pre-flight scripts: `npm run setup`, `npm run dev`, `npm start`, `npm run lint`, `npm run format`, `npm run doctor:react`, `npm run fallow:health`.
- Issue templates, PR template, Dependabot config, security policy.

### Known v1 trade-offs

- One pipeline job at a time (global `AppLock`).
- Linear `xfade` chain for multi-clip crossfade (correct, not maximally efficient).
- Retry infers the failed stage from the last failed job rather than reading a per-stage durable cursor.

[Unreleased]: https://github.com/unloopedmido/cuekiyo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/unloopedmido/cuekiyo/releases/tag/v1.0.0
