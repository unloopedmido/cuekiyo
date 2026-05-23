---
target: project-setup page
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-05-22T04-15-33Z
slug: frontend-src-pages-project-setup-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Inline validation, loading spinner on submit, search busy state |
| 2 | Match System / Real World | 2 | Primary CTA says "Create & load themes" (pipeline jargon) |
| 3 | User Control and Freedom | 3 | Remove anime, collapsible advanced, disabled submit until valid |
| 4 | Consistency and Standards | 3 | Field components match settings/defaults vocabulary |
| 5 | Error Prevention | 3 | Required fields, min/max on numbers, trySubmit gating |
| 6 | Recognition Rather Than Recall | 3 | Sticky aside lists steps and selected anime |
| 7 | Flexibility and Efficiency | 2 | No presets/templates; manual search only |
| 8 | Aesthetic and Minimalist Design | 3 | Clean two-column form; advanced settings tucked away |
| 9 | Error Recovery | 3 | Errors inline + toast; form state preserved |
| 10 | Help and Documentation | 3 | Aside empty state teaches 3-step flow |
| **Total** | | **29/40** | **Good** |

#### Anti-Patterns Verdict

**LLM assessment**: Best page in the app for progressive disclosure. Form + sticky selection panel is purposeful, not decorative card stacking. Still reads as polished shadcn form rather than "Floating Cut Room" cinematic studio.

**Deterministic scan**: Unavailable (bundled detector not found).

#### Overall Impression

Strong setup flow with validation and teaching aside. Copy on the primary action and search interaction are the main friction points for minimally tech-literate creators.

#### What's Working

1. **Progressive advanced settings** — Encoder/audio collapsed by default matches Product Principle #3.
2. **Selection sidebar** — Keeps chosen anime visible while filling the form (fixes memory-bridge risk).
3. **Field-level validation** — Touch/submit-aware errors without wiping input.

#### Priority Issues

- **[P1] What**: Submit button label "Create & load themes" uses backend vocabulary.
- **Why it matters**: PRODUCT.md explicitly prefers "Review candidates" style copy; "load themes" is opaque to casual creators.
- **Fix**: Rename to "Start compilation" or "Create and find songs" with subtitle explaining what happens next.
- **Suggested command**: `/impeccable clarify project-setup primary CTA`

- **[P2] What**: Anime search requires clicking Search (or Enter) with no debounced results.
- **Why it matters**: Extra step and failure mode when users type and wait; mobile users may not discover Search button.
- **Fix**: Debounce search at 2+ chars or search on Enter with visible hint.
- **Suggested command**: `/impeccable polish project-setup anime search`

- **[P2] What**: Search result posters use empty alt text.
- **Why it matters**: Screen readers lose meaningful context for picks; decorative-only alt is wrong if titles are duplicated nearby (they are, but pattern is risky).
- **Fix**: alt="" is OK if title text is adjacent; ensure list item announces full title on focus.
- **Suggested command**: `/impeccable audit project-setup search results`

#### Persona Red Flags

**Jordan (First-Timer)**: "Target count" and "Clip length (s)" lack helper text explaining what they mean for the final video.

**Sam (Accessibility)**: Toggle group for song types needs explicit group label association verified; search results in scroll area may trap focus.

**Casey (Mobile)**: Two-column layout stacks but sticky aside may push primary submit far down after many anime added.

#### Minor Observations

- "Encoder & audio ↓" uses ASCII arrows instead of chevron icon (inconsistent with icon language elsewhere).
- Wide screens leave empty right-column space when anime list is short.
- Enter in search prevents form submit (good) but is undiscoverable.

#### Questions to Consider

- What if song count defaulted visually with a slider instead of a bare number field?
- Could the aside show a live preview of compilation shape (N songs × clip length)?
