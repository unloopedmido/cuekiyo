---
target: dashboard page
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-05-22T04-15-19Z
slug: frontend-src-pages-dashboard-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong status badges and filter counts; delete menu only visible on hover |
| 2 | Match System / Real World | 3 | Creator-facing copy ("Output ready", "Needs you"); minor pipeline term leakage in filters |
| 3 | User Control and Freedom | 3 | Delete confirmation dialog; search clear; no undo for delete |
| 4 | Consistency and Standards | 3 | Matches app shell; card pattern repeats identically |
| 5 | Error Prevention | 3 | Destructive confirm; binaries alert links to settings |
| 6 | Recognition Rather Than Recall | 3 | Labeled sidebar, search placeholder, filter pills with counts |
| 7 | Flexibility and Efficiency | 3 | Command palette, keyboard shortcuts, search/filter |
| 8 | Aesthetic and Minimalist Design | 2 | Functional but card-list sameness reads generic dashboard |
| 9 | Error Recovery | 3 | Toast + inline alert on load failure |
| 10 | Help and Documentation | 2 | Empty state teaches; no help for filters or statuses |
| **Total** | | **28/40** | **Good** |

#### Anti-Patterns Verdict

**LLM assessment**: Does not scream "AI slop," but the repeated rounded card rows with badge + title + meta + pill CTA is familiar shadcn dashboard territory. Lime accent and dark studio palette align with DESIGN.md; missing the promised spatial choreography and liquid-glass signature moments.

**Deterministic scan**: Unavailable (bundled detector not found in skill scripts).

#### Overall Impression

Solid project hub with thoughtful prioritization (Needs you first) and good empty/loading states. Biggest gap: cards feel interchangeable and secondary actions (delete) are too hidden.

#### What's Working

1. **Attention-aware sorting and filters** — "Needs you" filter with counts respects the checkpoint workflow.
2. **Status-forward cards** — Each row leads with status badge, human description, and a contextual CTA ("Open output").
3. **Power-user affordances** — Command palette and global shortcuts without cluttering the page.

#### Priority Issues

- **[P1] What**: Delete/remove is only reachable via a hover-revealed overflow menu on each card.
- **Why it matters**: Keyboard users, touch users, and anyone who does not hover never discover it; fails progressive disclosure in the wrong direction (hides destructive action too well).
- **Fix**: Always show a visible overflow trigger, or move delete into card focus menu with keyboard access.
- **Suggested command**: `/impeccable harden dashboard delete affordance`

- **[P2] What**: Identical card template for every project regardless of state.
- **Why it matters**: Completed, failed, and gated projects look structurally the same; reduces scan speed at scale.
- **Fix**: Vary layout by state (compact row for completed, emphasized CTA band for gated).
- **Suggested command**: `/impeccable layout dashboard project cards`

- **[P2] What**: "Needs you (0)" filter is visible even when empty, offering no guidance.
- **Why it matters**: Dead-end filter teaches nothing when count is zero.
- **Fix**: Hide or disable with tooltip when zero, or show explanatory empty copy inside filter view.
- **Suggested command**: `/impeccable onboard dashboard attention filter`

#### Persona Red Flags

**Alex (Power User)**: No bulk delete or multi-select; must open each card menu individually. Search is good but no sort override.

**Jordan (First-Timer)**: "Needs you" vs "Ready to watch" is clear, but status badge labels like "Output ready" may not explain next action without reading description.

**Yuki (Local anime creator)**: Full path not shown here (good), but card density may feel like a task manager rather than a creative studio shelf.

#### Minor Observations

- Duplicate "Toggle Sidebar" nodes in accessibility tree.
- Primary CTA duplicated in header and empty state (acceptable).
- Filter pills use rounded-full while other controls use rounded-lg (minor vocabulary drift).

#### Questions to Consider

- What if the dashboard showed a single "Continue" hero for the highest-priority gated project?
- Does every project need a full card, or would a compact list suffice for completed outputs?
