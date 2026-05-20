# Backend Pipeline Rewrite and Performance Design

## Goal

Improve the backend logic of the local anime MV pipeline so it is more reliable, easier to maintain, and faster end to end without changing the project constraints.

The first implementation slice focuses on the backend pipeline, job lifecycle, state handling, and media-stage performance. Frontend changes are out of scope unless they directly reduce backend load or make backend progress behavior testable.

## Constraints

- Keep FastAPI, SQLite, SQLAlchemy, background threads, and the existing local data layout.
- Do not add Redis, Celery, Docker as a requirement, Postgres, paid APIs, or cloud dependencies.
- Continue using subprocess argument lists for `yt-dlp`, `ffmpeg`, and `ffprobe`.
- Keep all generated project files under `data/projects/{project_id}/` through `services/paths.py`.
- Preserve user-gated states: `SONG_SELECTION`, `AWAITING_CANDIDATES`, and `AWAITING_RENDER_ORDER`.
- Preserve existing local edits in `backend/app/jobs/runner.py`, `backend/app/main.py`, and `backend/tests/test_audit_fixes.py`.

## Current Problems

The backend runner currently mixes job lifecycle, state transition, global locking, progress logging, cancellation, recovery, and stage execution in one large module. This makes failures hard to reason about and has already produced fragile behavior around cancellation, recovery, and automatic continuation.

The existing backend test run hangs at `tests/test_audit_fixes.py::test_stage_start_blocks_incomplete_candidates`. That indicates the `/stage/start` path can reach job startup behavior when the test expects prerequisite validation to reject the request synchronously.

End-to-end runtime is also inflated by repeated subprocess work. Candidate sourcing shells out to `yt-dlp` serially for multiple queries per song. Media stages repeatedly call `ffprobe`, re-encode clips in separate passes, and do not consistently skip valid stage outputs. Progress and log writes also commit frequently during long-running work, which can turn SQLite into a bottleneck.

## Recommended Approach

Use a targeted backend pipeline rewrite instead of a full application rewrite.

The public API shape can remain mostly stable. Internally, split runner responsibilities into smaller units with clear contracts:

- Job lifecycle: create, start, finish, fail, cancel, and auto-continue jobs.
- Lock management: acquire, heartbeat, release, and recover the single global pipeline lock.
- Progress reporting: update job progress, emit WebSocket events, and persist logs without excessive commits.
- Stage execution: one explicit function or service per pipeline stage.
- Stage resume checks: decide whether an existing output is valid enough to skip work.

This provides most of the reliability and speed benefit without replacing the whole stack.

## Behavior Changes

### Prerequisite and State Handling

All user-gated transitions must validate prerequisites before starting any background job. `/projects/{project_id}/stage/start` should reject incomplete candidate selection or invalid render order with a 400 response and should not create or start a job in those cases.

Stage handlers should transition projects only through `state_machine.py`. Any direct status update that bypasses transition validation should be removed unless it is a terminal failure or cancellation path allowed by the state machine.

Retry should restart from the failed stage and clear the relevant error fields. It should not repeat prior valid outputs unless the output is missing or invalid.

### Job Lifecycle

The runner should have one consistent lifecycle path:

1. Create a queued job.
2. Acquire the global lock.
3. Mark the job running.
4. Execute the stage.
5. Mark completed, failed, or cancelled.
6. Release the lock safely.
7. Emit final progress.
8. Auto-start the next non-user-gated stage when appropriate.

Exception handling should rollback the active session before writing terminal state. Finalization should use stable job IDs instead of relying on possibly stale ORM objects.

### Resumable Stages

Each media stage should skip work when its expected output exists and validates:

- Download: skip when `song.download_path` exists and ffprobe confirms valid video.
- Normalize: skip when the normalized output exists, validates, and matches the expected project output format closely enough for the current pipeline.
- Cut: skip when the clean clip exists and the saved start/end metadata is present.
- Overlay: skip when the overlay clip exists and validates.
- Render audio preparation: skip generated silent-audio helper clips when they already exist and validate.
- Final render: skip only when the final output exists, validates, and the render order plus input clip list has not changed.

The first implementation can use conservative validation and skip only when correctness is clear. It is acceptable to leave final-render skipping for a later slice if input fingerprinting would make the first slice too large.

### Performance Improvements

Candidate sourcing should reduce redundant `yt-dlp` calls. Search query generation should deduplicate identical or near-identical queries before execution. Independent search queries may use bounded concurrency, with a small default concurrency limit to avoid overwhelming `yt-dlp` or YouTube.

Media stages should cache ffprobe metadata during a stage so the same file is not probed repeatedly. Encoder detection should remain cached and should not run once per song when one stage-level value is enough.

Progress and log persistence should be throttled. Important checkpoints should still commit immediately: job start, stage item start, stage item complete, terminal job state, and errors. Large ffmpeg stderr output should be truncated and written as a bounded number of log entries.

## Testing Strategy

Use test-first changes for the implementation slice.

Add or update backend tests for:

- `/stage/start` rejects incomplete candidate selections without starting a job.
- `/stage/start` rejects invalid render order without starting a job.
- Completed valid stage outputs are skipped and do not invoke the corresponding subprocess wrapper.
- Invalid or missing outputs are regenerated.
- Job failure and cancellation leave the lock released and terminal job/project state correct.
- Stale lock recovery marks only stale running jobs failed.
- Candidate query deduplication avoids duplicate search subprocess calls.

Run focused tests after each change, then the full backend test suite. If the full suite still hangs, isolate the remaining hanging test before expanding scope.

## Rollout Plan

1. Fix the hanging prerequisite-validation test and the underlying `/stage/start` behavior.
2. Extract or isolate job lifecycle helpers while preserving current public runner behavior.
3. Add stage skip/resume helpers and cover them with focused tests.
4. Reduce candidate sourcing subprocess calls with query deduplication and optional bounded concurrency.
5. Add ffprobe metadata caching and reduce avoidable encoder detection calls.
6. Throttle progress/log commits where tests can verify behavior or the code path is straightforward.
7. Run the backend test suite and document any remaining manual verification steps from `README.md`.

## Non-Goals

- No frontend redesign.
- No database migration framework in the first slice.
- No replacement of SQLite or the thread-based job runner.
- No cloud APIs, paid APIs, queues, or external services.
- No aggressive media pipeline fusion unless correctness can be verified with existing tests and local manual checks.

## Open Decisions

The initial implementation should favor conservative skipping over maximum speed. A valid output can be reused only when the code can prove it belongs to the current project settings or when regenerating would be safer.

Bounded candidate sourcing concurrency should start low, likely two workers, and remain configurable only if the codebase already has a suitable settings pattern.
