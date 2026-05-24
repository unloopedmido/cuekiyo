<p align="center">
  <img src="docs/assets/cover.png" alt="Cuekiyo — local anime compilation studio" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/unloopedmido/cuekiyo/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/unloopedmido/cuekiyo/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/unloopedmido/cuekiyo?style=flat-square"></a>
  <a href="https://github.com/unloopedmido/cuekiyo"><img alt="Version" src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=flat-square"></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-yes-8BC34A?style=flat-square">
  <img alt="Python" src="https://img.shields.io/badge/python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/node-24_LTS-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="Stack" src="https://img.shields.io/badge/stack-FastAPI%20%2B%20React-61DAFB?style=flat-square">
</p>

## About

**Turn anime picks into a finished compilation — on your machine.**

Pick shows, choose songs, review clips at three checkpoints, and export a titled MV. Cuekiyo handles sourcing, cutting, overlays, and rendering locally. No cloud, no subscription, no upload step.

> **Cue** — song cues, video checkpoints, timeline markers, render gates.  
> **Kiyo** — clean, quiet clarity.

---

## Why creators use Cuekiyo

You already know the grind: hunt openings on YouTube, match timestamps, add lower-thirds, normalize audio, pray ffmpeg does not explode. Cuekiyo replaces that scatter with one guided studio that runs on your machine and only stops where your taste matters.

| | |
|---|---|
| **Three checkpoints, not twelve tabs** | Songs → clip sources → render order. Everything else is automatic. |
| **Your machine, your files** | SQLite + project folders under `data/`. Nothing leaves unless you export. |
| **Smart sourcing** | YouTube search with scoring and heatmap-based clip starts. |
| **Polished output** | Lower-thirds, crossfades, per-clip export, re-render without re-downloading. |
| **Power when you want it** | Paste your own links, bulk MAL import, templates, unlimited song counts. |

## See it in action

| Dashboard | Review clips | Finished output |
|-----------|--------------|-----------------|
| ![Dashboard](docs/assets/dashboard.png) | ![Review clips gate](docs/assets/project-gate.png) | ![Completed project](docs/assets/completed.png) |

## Get started in two commands

**Requirements:** Python 3.11+, Node.js 24 LTS, `ffmpeg`, `ffprobe`, and `yt-dlp`.

```bash
git clone https://github.com/unloopedmido/cuekiyo.git
cd cuekiyo
npm run setup
npm run dev
```

Open **http://localhost:5173** — the app walks you through your first compilation.

Prefer a single local URL after setup? Build once, then run the bundled server:

```bash
npm start
```

Open **http://127.0.0.1:8000** — frontend and API on one port.

### System tools

Install `ffmpeg`, `ffprobe`, and `yt-dlp` before your first project:

**Linux (Arch/CachyOS)** — `sudo pacman -S yt-dlp ffmpeg ttf-dejavu`  
**macOS** — `brew install yt-dlp ffmpeg`  
**Windows** — `winget install yt-dlp.yt-dlp` and `winget install Gyan.FFmpeg`

Verify everything is ready: http://127.0.0.1:8000/api/system/binaries (all four entries should be available).

## How it works

1. **Create a project** — name it, pick anime, choose song types and overlay style.
2. **Select songs** — review the theme list; Cuekiyo sources YouTube candidates (or you paste links).
3. **Review clips** — pick one source per song; trim start and duration if needed.
4. **Render** — confirm order, composite overlays, download the final MP4.

The pipeline auto-advances between stages. It pauses only at song selection, candidate review, optional trim, and render order.

## Settings at a glance

- **Compilation defaults** (song count, clip length, encoder, etc.) — saved in your browser on the Settings page.
- **Pipeline tuning** (workers, ffmpeg quality, metadata provider, rate limits) — copy `.env.example` to `.env` and restart the backend.
- **Anime metadata** — switch Jikan/AniList on Settings; theme lists still come from Jikan.

## For contributors

```bash
npm test          # backend pytest + frontend tests + build
npm run lint
npm run format
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for PR guidelines and [SECURITY.md](SECURITY.md) for vulnerability reports.

<details>
<summary>Manual verification checklist</summary>

### Manual source mode

1. Create project with "I'll paste YouTube links"
2. Complete song selection → confirm pipeline skips sourcing and lands on review clips
3. Paste a valid YouTube URL per song; confirm thumbnail/title appear
4. After last song, confirm download starts automatically

### Overlay, trim, reprocess, templates

- Overlay disabled → no lower-third on final clips; minimal + top position → overlay at top
- Trim gate → custom start/duration on one song; heatmap on another
- Re-apply overlay / render again → no re-download
- Duplicate project, download clips ZIP, save/load project templates
- Bulk MAL import + unlimited songs; crossfade 0 s vs 1 s on final MP4

</details>

## Data layout

| Path | Purpose |
|------|---------|
| `data/pipeline.db` | SQLite database |
| `data/settings.json` | Legacy pipeline settings (optional) |
| `data/projects/{id}/` | Downloads, clips, output |

These paths are gitignored. Delete `data/pipeline.db` for a clean slate.

## Known limitations (v1)

- One pipeline job at a time (global lock)
- Concat crossfade chain is simplified for 2+ clips
- Retry infers failed stage from the last failed job

## Legal notice

Cuekiyo is **local personal software**. It does not host, distribute, or publish your videos.

**You are solely responsible** for rights and permissions on any anime footage, music, and third-party video you source or export, and for complying with copyright law and platform terms (including YouTube's Terms of Service).

The authors are **not affiliated with your output** and do not review compilations you create.

## License

MIT — see [LICENSE](LICENSE).
