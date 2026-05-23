---
target: project page
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-05-22T04-15-33Z
slug: frontend-src-pages-project-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Stepper, websocket progress, polling, status badge, skeleton loading |
| 2 | Match System / Real World | 2 | Full filesystem path shown on completed output |
| 3 | User Control and Freedom | 3 | Cancel running jobs, retry failed, back link on cancelled |
| 4 | Consistency and Standards | 3 | Shares PageHeader/stepper vocabulary with rest of app |
| 5 | Error Prevention | 3 | Draft gate before sourcing; confirm via explicit buttons |
| 6 | Recognition Rather Than Recall | 3 | Pipeline stepper shows full journey; breadcrumb uses project title when loaded |
| 7 | Flexibility and Efficiency | 3 | Refresh polling; keyboard shortcuts via global layer |
| 8 | Aesthetic and Minimalist Design | 2 | Completed state repeats status copy in three places |
| 9 | Error Recovery | 3 | FAILED panel with error_message + retry |
| 10 | Help and Documentation | 2 | Draft CTA explains next step; gated steps depend on child components |
| **Total** | | **28/40** | **Good** |

#### Anti-Patterns Verdict

**LLM assessment**: Core workflow page shows the most product personality (stepper, video preview, lime CTAs). Still leans admin-dashboard in the completed state due to raw path display and redundant status blocks. No motion.dev choreography visible despite DESIGN.md calling it identity-critical.

**Deterministic scan**: Unavailable (bundled detector not found).

#### Overall Impression

The architectural spine of the app is sound: sidebar stepper + state-specific main panel. Completed output undermines the calm studio feel by surfacing backend paths and repeating "ready to review" copy.

#### What's Working

1. **Pipeline stepper** — Collapses to summary on terminal states with expand option; good cognitive load tradeoff.
2. **Live progress integration** — WebSocket + polling keeps long renders understandable.
3. **Completed preview** — Inline video player with download/reveal actions is the right celebratory moment.

#### Priority Issues

- **[P1] What**: Completed output displays full absolute filesystem path below actions.
- **Why it matters**: Violates Design Principle #5 (local confidence without backend machinery first) and PRODUCT anti-reference of server-monitoring interfaces.
- **Fix**: Hide path behind "Copy path" or diagnostics disclosure; show filename only by default.
- **Suggested command**: `/impeccable distill project completed output path`

- **[P2] What**: Status description duplicated in header, stepper summary card, and output section.
- **Why it matters**: Wastes vertical space; copy fatigue on the payoff screen.
- **Fix**: Keep headline in header; let output section focus on video + actions only.
- **Suggested command**: `/impeccable layout project completed state`

- **[P2] What**: Breadcrumb shows generic "Compilation" until project fetch completes.
- **Why it matters**: Brief IA flicker on navigation; screen readers announce wrong label.
- **Fix**: Skeleton breadcrumb or carry title from dashboard list via router state.
- **Suggested command**: `/impeccable harden project breadcrumb loading`

#### Persona Red Flags

**Alex (Power User)**: Would want jump links between gated steps from stepper clicks (currently display-only).

**Jordan (First-Timer)**: FAILED state shows raw error_message in monospace pre without plain-language translation.

**Sam (Accessibility)**: Video player controls are native (good); ensure stepper current step is announced on status change.

#### Minor Observations

- CompilationSummary meta chips ("Naruto +1 more") are interactive buttons without obvious affordance.
- Draft "Begin sourcing" panel uses dashed primary border (acceptable emphasis, not side-stripe).
- Page title updates after load (good) but document title lag on first paint.

#### Questions to Consider

- What if completing a compilation triggered a single focal "watch" moment with everything else receded?
- Should the stepper be clickable for power users to revisit earlier gated steps?
