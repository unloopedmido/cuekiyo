# Launch assets

Marketing assets for the public README and GitHub social preview.

| File | Purpose |
|------|---------|
| `cover.png` / `cover.svg` | README hero banner with wordmark and tagline |
| `dashboard.png` | Projects list with active and completed compilations |
| `project-gate.png` | Candidate review checkpoint |
| `completed.png` | Finished project with output actions |
| `social-preview.png` | GitHub social preview (1280×640) — upload in repo Settings → General |

## Regenerating

Use the dark theme. Capture screenshots at 1440×900 (2× retina) for crisp PNGs. Avoid prominent copyrighted artwork in marketing shots when possible.

```bash
npm run dev
# capture with browser automation or manual screenshots into this folder
```

Export `cover.png` from `cover.svg` when editing the banner layout.

The SVG template at [social-preview.svg](social-preview.svg) remains available for the GitHub link preview card.
