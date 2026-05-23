---
target: frontend-shadcn UI
total_score: 24
p0_count: 0
p1_count: 2
p2_count: 3
timestamp: 2026-05-22T03-29-10Z
slug: frontend-shadcn-src
---
# Design Critique: frontend-shadcn

**Target:** `frontend-shadcn/src` (MV Pipeline shadcn UI)  
**Date:** 2026-05-22

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong on running jobs (progress %, logs, WS); weak on compose gate (disabled CTA with no inline reason) |
| 2 | Match System / Real World | 2 | Nav uses Library/Compose/System; workflow copy uses pipeline jargon (MAL, OP/ED) mixed with creator language |
| 3 | User Control and Freedom | 3 | Cancel, delete confirm, command palette, sort undo; no escape from partial song picks mid-flow |
| 4 | Consistency and Standards | 2 | Breadcrumb says "Project" not project title; duplicate nav labels (sidebar + breadcrumb); section patterns vary (dashed tint vs bordered vs plain) |
| 5 | Error Prevention | 2 | Fewer-than-target songs dialog is good; compose submit disabled without visible field-level summary |
| 6 | Recognition Rather Than Recall | 2 | Stepper helps orientation but lists all 8 stages with descriptions even when finished; candidate tabs require scanning many song names |
| 7 | Flexibility and Efficiency | 3 | ⌘K, shift shortcuts, search/filter, sort-by-views, command palette project jump |
| 8 | Aesthetic and Minimalist Design | 2 | Cleaner than first scaffold, but stat tiles + stepper + empty compose column still feel template-assembled |
| 9 | Error Recovery | 3 | Failed stage block with error text + retry; backend errors surfaced via Alert + toast |
| 10 | Help and Documentation | 2 | `?` shortcuts dialog and System install hints exist; no contextual help at user gates (song/candidate/order) |
| **Total** | | **24/40** | **Needs Work** |

## Anti-Patterns Verdict

**LLM assessment:** Does not scream "first-hour AI dashboard" anymore, but it still matches the second-order reflex: dark zinc shell, lime primary, inset sidebar, uppercase micro-label stat row, vertical numbered stepper. The redesign moved away from the old app's bottom nav, yet the information scent still reads "generic local tool UI" rather than "calm creative studio for anime compilations" described in PRODUCT.md.

**Deterministic scan:** Unavailable (`detect.mjs` bundled detector not found in this environment).

**Browser inspection:** Live review at http://localhost:5174 (Library, Compose, completed project). No overlay injection attempted (detector dependency missing).

## Overall Impression

The interface is **functionally credible** and noticeably better than the first scaffold. The project page stepper + video export layout is the strongest screen. The biggest gap is **product voice and focus**: screens still explain the machinery (8 pipeline stages, stat counts) instead of leading creators through the next creative decision. Tighten language, reduce always-on chrome on finished projects, and give Compose/Library clearer "what do I do next" hierarchy.

## What's Working

1. **Project page spatial model** — Left stepper + right workspace separates "where am I" from "what do I do now." The completed-state video preview with Download / Reveal in folder is appropriately dominant.

2. **Candidate review pattern** — Thumbnail grid with click-to-select is the right affordance for taste decisions; much better than radio-in-a-list.

3. **shadcn composition discipline** — InputGroup search, Item rows on Library, FieldGroup on Compose, and sonner feedback show the stack is being used structurally, not only cosmetically.

## Priority Issues

### [P1] Product language does not match creator mental model
- **What:** Global nav uses Library / Compose / System while PRODUCT.md prescribes creator-facing terms (projects, review candidates, render order). Compose form uses OP/ED and "Search MAL titles."
- **Why it matters:** Jordan (first-timer) must translate labels before trusting the tool. Violates "calm studio" positioning.
- **Fix:** Align nav + headings with domain verbs: Projects, New compilation, Settings. Replace OP/ED with Openings/Endings in UI; spell out "MyAnimeList" once, then shorten.
- **Suggested command:** `impeccable clarify`

### [P1] Pipeline stepper overload on terminal projects
- **What:** Completed projects still show all 8 stages with full descriptions and connector lines occupying ~40% width.
- **Why it matters:** High extraneous cognitive load on the payoff screen. Users finished the job; they want export, not a syllabus.
- **Fix:** Collapse stepper to a compact "Completed" summary on terminal states, or show only current + adjacent stages during active work.
- **Suggested command:** `impeccable distill`

### [P2] Library row competes with itself for attention
- **What:** Each project row shows status badge, secondary description, a text CTA ("Open output"), and a delete icon in one horizontal band.
- **Why it matters:** Scanning 5+ projects becomes noisy; primary action unclear (title link vs ghost button vs badge).
- **Fix:** One primary action per row (clickable row or explicit button). Move delete to overflow menu. Let status badge carry state without repeating description in two places.
- **Suggested command:** `impeccable layout`

### [P2] Compose page wastes horizontal space without guiding empty state
- **What:** Right "Selected (0)" column is a single line of placeholder text with vast empty area on wide screens.
- **Why it matters:** First project creation is the activation moment; empty panel feels abandoned, not inviting.
- **Fix:** Use poster grid previews, example compilation hint, or merge into single-column flow until first anime is added. Animate/add emphasis when count goes from 0 to 1.
- **Suggested command:** `impeccable onboard`

### [P2] Breadcrumb and header do not reinforce context
- **What:** Project breadcrumb ends at generic "Project"; page title shows name but breadcrumb does not.
- **Why it matters:** Breaks recognition heuristic when multiple tabs open; screen reader users lose hierarchy.
- **Fix:** `Library > test run 6` with truncation; consider dropping redundant breadcrumb when PageHeader already states title.
- **Suggested command:** `impeccable layout`

## Persona Red Flags

**Jordan (Confused first-timer):** "Compose" does not obviously mean "start a new video." Disabled green "Create & load themes" with no explanation until fields are filled. OP/ED toggles unexplained. No visible help link on song or candidate gates. Will hesitate at Library stat row meanings (NEEDS YOU vs FINISHED).

**Alex (Power user):** Keyboard shortcuts and command palette are a win. Red flags: duplicate navigation to project (title link + Open output button), non-interactive stepper (cannot jump stages), Library delete icon always visible (misclick risk). Raw filesystem path on export screen is power-user useful but visually noisy.

**Sam (Anxious during long jobs):** Progress panel with percent + log toggle is reassuring. "Stop" label is clear. Concern: lime-highlighted progress block may read as "error/attention" when simply running; consider calmer running state vs attention state.

## Minor Observations

- Stat blocks (PROJECTS / NEEDS YOU / FINISHED) read as SaaS KPI widgets; consider replacing with inline sentence summary when count < 3.
- Theme toggle (`d` key) is undiscoverable; no UI affordance in System.
- Command palette heading visible in accessibility tree even when closed (verify aria-hidden on dialog).
- Candidate grid "YouTube" link only visible on hover; keyboard/touch users may miss it.
- Lime accent appears on stepper ring, progress panel border, draft CTA section, and primary buttons; slightly over-committed for "restrained" product register.

## Questions to Consider

- What if the Library showed only "Continue" compilations by default, with finished work in a secondary filter?
- Does a finished project need the full pipeline map, or just export + optional "view steps" disclosure?
- What would it look like if the app's vocabulary matched one sentence from the user: "I'm making an opening compilation from these anime"?
