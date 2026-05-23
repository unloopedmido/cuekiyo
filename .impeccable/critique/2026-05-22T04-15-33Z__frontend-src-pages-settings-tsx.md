---
target: settings page
total_score: 21
p0_count: 0
p1_count: 2
timestamp: 2026-05-22T04-15-33Z
slug: frontend-src-pages-settings-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Pipeline tab shows plain "Loading…" text, no skeleton |
| 2 | Match System / Real World | 1 | Default tab is backend tuning (Jikan, CRF, stale lock) |
| 3 | User Control and Freedom | 3 | Save/reset on defaults; pipeline save |
| 4 | Consistency and Standards | 2 | ffmpeg install hint says brew on a Linux app context |
| 5 | Error Prevention | 2 | Numeric pipeline fields lack inline bounds feedback before save |
| 6 | Recognition Rather Than Recall | 2 | Pipeline fields have labels but no descriptions |
| 7 | Flexibility and Efficiency | 3 | Tabs separate concerns; reasonable for power users |
| 8 | Aesthetic and Minimalist Design | 2 | Default tab feels like server config, not creative studio settings |
| 9 | Error Recovery | 3 | Alerts on fetch/save errors |
| 10 | Help and Documentation | 1 | Install commands platform-wrong; no field help |
| **Total** | | **21/40** | **Acceptable** |

#### Anti-Patterns Verdict

**LLM assessment**: Most misaligned page with PRODUCT.md. Opening on "Pipeline" with worker counts and CRF reads like the generic admin dashboard the anti-references explicitly reject. Local tools tab is useful but undermined by brew-centric install hints on Linux.

**Deterministic scan**: Unavailable (bundled detector not found).

#### Overall Impression

Functionally complete settings surface, but IA defaults invert progressive power: backend knobs first, creator defaults second. This is the highest-impact page to realign with brand intent.

#### What's Working

1. **Tab separation** — Defaults, tools, and pipeline are logically grouped.
2. **Local tools table** — Clear OK/Missing with detail column supports local confidence when accurate.
3. **Defaults mirror setup form** — Reduces vocabulary drift for song types, encoder, clip length.

#### Priority Issues

- **[P1] What**: Default selected tab is "Pipeline" (power-user backend tuning).
- **Why it matters**: Violates Product Principle #3 (progressive power); first-time creators landing in Settings see server knobs.
- **Fix**: Default to "New compilation defaults" or "Local tools"; move Pipeline last or behind Advanced.
- **Suggested command**: `/impeccable distill settings tab order`

- **[P1] What**: Install hints use `brew install ffmpeg` regardless of platform.
- **Why it matters**: User is on Linux (Kubuntu); wrong guidance erodes trust in "local confidence."
- **Fix**: Platform-aware commands or neutral docs links (apt/dnf/pacman + ffmpeg.org).
- **Suggested command**: `/impeccable clarify settings install hints`

- **[P2] What**: Pipeline numeric fields lack descriptions (what is CRF, stale lock, Jikan rate).
- **Why it matters**: Even power users need unit context; minimally tech-literate creators will bounce.
- **Fix**: FieldDescription under each, or collapse entire Pipeline tab behind "Advanced diagnostics."
- **Suggested command**: `/impeccable onboard settings pipeline tab`

#### Persona Red Flags

**Jordan (First-Timer)**: Opening Settings shows "Data directory" path first; feels like editing server config.

**Alex (Power User)**: Pipeline tab is useful but wants validation feedback and test buttons (e.g., verify ffmpeg NVENC).

**Yuki (Local anime creator)**: Wants font/overlay defaults here, not worker pool sizes.

#### Minor Observations

- Loading state is text-only while other pages use skeletons.
- Badge OK/Missing pairs text with color (acceptable).
- max-w-xl constrains pipeline form leaving unused horizontal space.

#### Questions to Consider

- What if Settings only showed creator defaults + tool health, with Pipeline moved to a CLI or log-adjacent panel?
- Should saving pipeline settings require explicit "Advanced" unlock?
