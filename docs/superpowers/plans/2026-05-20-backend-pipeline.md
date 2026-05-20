# Backend Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the backend pipeline safer and faster by fixing gated stage startup, adding conservative stage resume checks, reducing duplicate candidate subprocess calls, and tightening job lifecycle behavior.

**Architecture:** Keep FastAPI, SQLite, SQLAlchemy, and the current thread-based runner. Introduce small helper functions around existing modules instead of replacing the app: route-level gate validation, runner stage-output skip helpers, candidate query deduplication, and focused job lifecycle tests.

**Tech Stack:** Python 3.11/3.12-compatible code, FastAPI, SQLAlchemy, pytest, existing `yt-dlp`/`ffmpeg`/`ffprobe` subprocess wrappers.

---

## File Structure

- Modify `backend/app/api/routes.py`: validate user-gated prerequisites before creating jobs in `/stage/start`.
- Modify `backend/app/jobs/runner.py`: preserve current recovery edits; add conservative skip helpers for normalize, cut, overlay, and render audio prep; keep lifecycle finalization stable.
- Modify `backend/app/services/youtube_sourcer.py`: deduplicate generated search queries before shelling out.
- Modify `backend/app/services/ffmpeg_engine.py`: skip regenerating silent-audio helper clips when an existing helper clip validates.
- Modify `backend/tests/test_audit_fixes.py`: make stage-start tests prove no job thread starts when prerequisites fail.
- Modify `backend/tests/test_youtube_sourcer.py`: cover query deduplication.
- Add `backend/tests/test_stage_resume.py`: cover skip/regenerate behavior for resumable stage outputs.

## Task 1: Fix Gated Stage Startup Before Job Creation

**Files:**
- Modify: `backend/app/api/routes.py`
- Modify: `backend/tests/test_audit_fixes.py`

- [ ] **Step 1: Write the failing test that proves no job starts for incomplete candidates**

Add this import near the other imports in `backend/tests/test_audit_fixes.py` if it is not already present:

```python
from unittest.mock import patch
```

Update `test_stage_start_blocks_incomplete_candidates` so it patches job startup:

```python
    with patch("app.api.routes.job_runner.start_job") as start_job:
        resp = client.post(f"/api/projects/{project.id}/stage/start")
        start_job.assert_not_called()
```

Keep the existing assertions:

```python
    assert resp.status_code == 400
    assert "selected candidate" in resp.json()["detail"].lower()
```

- [ ] **Step 2: Run the focused test and confirm it fails or hangs on current behavior**

Run:

```bash
cd backend
timeout 20 ./.venv/bin/pytest -vv tests/test_audit_fixes.py::test_stage_start_blocks_incomplete_candidates
```

Expected before the fix: the command times out or fails because the route starts background job behavior instead of rejecting synchronously.

- [ ] **Step 3: Implement route-level prerequisite validation before job startup**

In `backend/app/api/routes.py`, replace the core of `start_next_stage` with this structure:

```python
@router.post("/projects/{project_id}/stage/start")
def start_next_stage(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    status = ProjectStatus(project.status)
    jt = job_type_for_status(status)
    if not jt:
        nxt = next_auto_status_after_user_gate(status)
        if not nxt:
            raise HTTPException(400, "No automatic stage for current status")
        try:
            validate_user_gate_prerequisites(status, list(project.songs))
        except PrerequisiteError as e:
            raise HTTPException(400, str(e)) from e
        validate_transition(status, nxt)
        project.status = nxt.value
        project.error_message = None
        db.commit()
        jt = job_type_for_status(nxt)

    if not jt:
        raise HTTPException(400, "No job for status")

    job = job_runner.start_job(project_id, jt)
    return {"jobId": job.id}
```

- [ ] **Step 4: Run the focused test and confirm it passes quickly**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_audit_fixes.py::test_stage_start_blocks_incomplete_candidates
```

Expected: `PASSED` in under a few seconds.

- [ ] **Step 5: Add invalid render-order no-start test**

Add this test to `backend/tests/test_audit_fixes.py`:

```python
def test_stage_start_blocks_invalid_render_order_without_starting_job(db_session):
    from app.database import get_db
    from app.models import Project, Song

    project = Project(
        title="Render Gate",
        status=ProjectStatus.AWAITING_RENDER_ORDER.value,
        songs_count=2,
        song_types='["opening"]',
    )
    db_session.add(project)
    db_session.flush()
    for title in ("Song A", "Song B"):
        db_session.add(
            Song(
                project_id=project.id,
                anime_mal_id=1,
                anime_name="Anime A",
                song_type="opening",
                song_number=1,
                song_title=title,
                raw_theme_text="OP1",
                render_order=0,
                selected_candidate_id="candidate-id",
            )
        )
    db_session.commit()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    try:
        with patch("app.api.routes.job_runner.start_job") as start_job:
            resp = client.post(f"/api/projects/{project.id}/stage/start")
            start_job.assert_not_called()
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 400
    assert "render order" in resp.json()["detail"].lower()
```

- [ ] **Step 6: Run both gated-start tests**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_audit_fixes.py::test_stage_start_blocks_incomplete_candidates tests/test_audit_fixes.py::test_stage_start_blocks_invalid_render_order_without_starting_job
```

Expected: both tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/routes.py backend/tests/test_audit_fixes.py
git commit -m "Fix gated stage startup validation"
```

## Task 2: Add Candidate Query Deduplication

**Files:**
- Modify: `backend/app/services/youtube_sourcer.py`
- Modify: `backend/tests/test_youtube_sourcer.py`

- [ ] **Step 1: Write a failing unit test for duplicate query removal**

Add this test to `backend/tests/test_youtube_sourcer.py`:

```python
def test_source_candidates_deduplicates_search_queries(monkeypatch):
    from app.services import youtube_sourcer

    calls = []

    def fake_build_queries(anime_name, song_title, song_type, song_number, artist):
        return [
            "Anime Song opening",
            "Anime Song opening",
            " Anime   Song   opening ",
        ]

    def fake_search(query, max_results=10):
        calls.append(query)
        return [
            {
                "id": f"id-{len(calls)}",
                "webpage_url": f"https://youtu.be/id-{len(calls)}",
                "title": "Anime Song Opening",
                "duration": 89,
                "view_count": 1000,
            }
        ]

    monkeypatch.setattr(youtube_sourcer, "build_search_queries", fake_build_queries)
    monkeypatch.setattr(youtube_sourcer, "yt_dlp_search", fake_search)

    results = youtube_sourcer.source_candidates_for_song(
        "Anime",
        "Song",
        "opening",
        1,
        None,
        top_n=3,
    )

    assert len(calls) == 1
    assert calls == ["Anime Song opening"]
    assert len(results) == 1
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_youtube_sourcer.py::test_source_candidates_deduplicates_search_queries
```

Expected before the fix: failure showing `len(calls)` is greater than `1`.

- [ ] **Step 3: Add a query normalization helper and use it**

In `backend/app/services/youtube_sourcer.py`, add:

```python
def _dedupe_queries(queries: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for query in queries:
        display = " ".join(query.split())
        key = display.casefold()
        if not display or key in seen:
            continue
        seen.add(key)
        deduped.append(display)
    return deduped
```

Then change the loop in `source_candidates_for_song`:

```python
    for query in _dedupe_queries(
        build_search_queries(anime_name, song_title, song_type, song_number, artist)
    ):
```

- [ ] **Step 4: Run youtube sourcer tests**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_youtube_sourcer.py
```

Expected: all tests in that file pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/youtube_sourcer.py backend/tests/test_youtube_sourcer.py
git commit -m "Deduplicate candidate search queries"
```

## Task 3: Add Conservative Stage Resume Tests and Helpers

**Files:**
- Create: `backend/tests/test_stage_resume.py`
- Modify: `backend/app/jobs/runner.py`

- [ ] **Step 1: Write failing tests for normalize and overlay skips**

Create `backend/tests/test_stage_resume.py`:

```python
from pathlib import Path
from unittest.mock import patch

from app.enums import ProjectStatus
from app.jobs.runner import JobRunner
from app.models import Job, Project, Song


def _project_with_song(db_session, status: ProjectStatus) -> tuple[Project, Job, Song]:
    project = Project(title="Resume", status=status.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    song = Song(
        project_id=project.id,
        anime_mal_id=1,
        anime_name="Anime",
        song_type="opening",
        song_number=1,
        song_title="Song",
        raw_theme_text="OP1",
        render_order=0,
        download_path="/tmp/download.mp4",
        clean_clip_path="/tmp/clean.mp4",
    )
    db_session.add(song)
    db_session.flush()
    job = Job(project_id=project.id, type="probe_normalize", status="running")
    db_session.add(job)
    db_session.commit()
    return project, job, song


def test_probe_normalize_skips_existing_valid_output(db_session, tmp_path, monkeypatch):
    project, job, song = _project_with_song(db_session, ProjectStatus.PROBING_NORMALIZING)
    expected = tmp_path / "normalized.mp4"
    expected.write_bytes(b"valid")

    runner = JobRunner()

    monkeypatch.setattr("app.jobs.runner.song_normalized_path", lambda project_id, song_id: expected)
    monkeypatch.setattr("app.services.ffmpeg_engine.is_valid_media", lambda path: True)
    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        runner._run_probe_normalize(db_session, job, project)

    run_ffmpeg.assert_not_called()
    db_session.refresh(project)
    assert project.status == ProjectStatus.CUTTING.value


def test_overlay_skips_existing_valid_output(db_session, tmp_path, monkeypatch):
    project, job, song = _project_with_song(db_session, ProjectStatus.OVERLAYING)
    clean = tmp_path / "clean.mp4"
    overlayed = tmp_path / "overlayed.mp4"
    clean.write_bytes(b"valid")
    overlayed.write_bytes(b"valid")
    song.clean_clip_path = str(clean)
    db_session.commit()

    runner = JobRunner()

    monkeypatch.setattr("app.jobs.runner.song_overlayed_path", lambda project_id, song_id: overlayed)
    monkeypatch.setattr("app.services.ffmpeg_engine.is_valid_media", lambda path: True)
    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        runner._run_overlay(db_session, job, project)

    run_ffmpeg.assert_not_called()
    db_session.refresh(project)
    db_session.refresh(song)
    assert project.status == ProjectStatus.AWAITING_RENDER_ORDER.value
    assert song.overlayed_clip_path == str(overlayed)
```

- [ ] **Step 2: Run tests and confirm they fail**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_stage_resume.py
```

Expected before the fix: failures because `run_ffmpeg` is still called.

- [ ] **Step 3: Add reusable valid-output helper**

In `backend/app/jobs/runner.py`, add near `_require_all_candidates_selected`:

```python
def _valid_existing_media(path: str | Path | None) -> bool:
    if not path:
        return False
    return ffmpeg_engine.is_valid_media(Path(path))
```

- [ ] **Step 4: Skip existing normalized output**

In `_run_probe_normalize`, after computing `out` and creating its parent, add:

```python
            if _valid_existing_media(out):
                song.status = SongStatus.NORMALIZING.value
                self._log_step(db, job, f"Skipping existing normalized clip for {song.song_title}")
                self._report_progress(
                    db,
                    job,
                    project,
                    item_index=i,
                    item_total=total,
                    message=f"Skipping existing normalized clip for {song.song_title}",
                    item_complete=True,
                )
                db.commit()
                continue
```

- [ ] **Step 5: Skip existing overlay output**

In `_run_overlay`, after computing `out` and creating its parent, add:

```python
            if _valid_existing_media(out):
                song.overlayed_clip_path = str(out)
                song.status = SongStatus.READY.value
                self._log_step(db, job, f"Skipping existing overlay for {song.song_title}")
                self._report_progress(
                    db,
                    job,
                    project,
                    item_index=i,
                    item_total=total,
                    message=f"Skipping existing overlay for {song.song_title}",
                    item_complete=True,
                )
                db.commit()
                continue
```

- [ ] **Step 6: Run stage resume tests**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_stage_resume.py
```

Expected: both tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/jobs/runner.py backend/tests/test_stage_resume.py
git commit -m "Skip reusable media stage outputs"
```

## Task 4: Skip Existing Cut Outputs and Cache Probe Metadata During Cut

**Files:**
- Modify: `backend/app/jobs/runner.py`
- Modify: `backend/tests/test_stage_resume.py`

- [ ] **Step 1: Write failing test for cut skip**

Add to `backend/tests/test_stage_resume.py`:

```python
def test_cut_skips_existing_valid_clip_with_saved_times(db_session, tmp_path, monkeypatch):
    project, job, song = _project_with_song(db_session, ProjectStatus.CUTTING)
    clean = tmp_path / "clean.mp4"
    clean.write_bytes(b"valid")
    song.cut_start_time = 10.0
    song.cut_end_time = 20.0
    db_session.commit()

    runner = JobRunner()

    monkeypatch.setattr("app.jobs.runner.song_clean_clip_path", lambda project_id, song_id: clean)
    monkeypatch.setattr("app.services.ffmpeg_engine.is_valid_media", lambda path: True)
    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        runner._run_cut(db_session, job, project)

    run_ffmpeg.assert_not_called()
    db_session.refresh(project)
    assert project.status == ProjectStatus.OVERLAYING.value
```

- [ ] **Step 2: Run the cut skip test and confirm it fails**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_stage_resume.py::test_cut_skips_existing_valid_clip_with_saved_times
```

Expected before the fix: `run_ffmpeg` is called.

- [ ] **Step 3: Implement cut skip**

In `_run_cut`, after computing `out` and creating its parent, add:

```python
            if (
                song.cut_start_time is not None
                and song.cut_end_time is not None
                and _valid_existing_media(out)
            ):
                song.clean_clip_path = str(out)
                self._log_step(db, job, f"Skipping existing clean clip for {song.song_title}")
                self._report_progress(
                    db,
                    job,
                    project,
                    item_index=i,
                    item_total=total,
                    message=f"Skipping existing clean clip for {song.song_title}",
                    item_complete=True,
                )
                db.commit()
                continue
```

Place this before `cmd = ffmpeg_engine.build_cut_cmd(...)`.

- [ ] **Step 4: Avoid repeated ffprobe JSON calls inside cut**

In `_run_cut`, create a local cache before the loop:

```python
        probe_cache: dict[Path, dict] = {}
```

Replace:

```python
            meta = ffmpeg_engine.ffprobe_json(inp)
```

with:

```python
            meta = probe_cache.get(inp)
            if meta is None:
                meta = ffmpeg_engine.ffprobe_json(inp)
                probe_cache[inp] = meta
```

- [ ] **Step 5: Run stage resume tests**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_stage_resume.py
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/jobs/runner.py backend/tests/test_stage_resume.py
git commit -m "Resume cut stage outputs"
```

## Task 5: Harden Job Lifecycle Regression Tests

**Files:**
- Modify: `backend/tests/test_audit_fixes.py`
- Modify: `backend/app/jobs/runner.py`

- [ ] **Step 1: Add regression test for failed job releasing the lock**

Add to `backend/tests/test_audit_fixes.py`:

```python
def test_failed_job_releases_pipeline_lock(db_session):
    from unittest.mock import patch

    from app.jobs.runner import JobRunner
    from app.models import AppLock, Job, Project

    project = Project(title="Fail", status=ProjectStatus.DOWNLOADING.value, song_types='["opening"]')
    db_session.add(project)
    db_session.flush()
    job = Job(project_id=project.id, type="download", status="queued")
    db_session.add(job)
    db_session.commit()

    runner = JobRunner()

    with patch("app.jobs.runner.SessionLocal", side_effect=lambda: db_session):
        with patch.object(runner, "_run_download", side_effect=RuntimeError("boom")):
            runner._run_job_thread(job.id)

    db_session.expire_all()
    lock = db_session.get(AppLock, "global_pipeline")
    job = db_session.get(Job, job.id)
    project = db_session.get(Project, project.id)

    assert lock.running_job_id is None
    assert lock.running_project_id is None
    assert job.status == "failed"
    assert project.status == ProjectStatus.FAILED.value
    assert "boom" in job.error_message
```

- [ ] **Step 2: Run the lifecycle regression test**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_audit_fixes.py::test_failed_job_releases_pipeline_lock
```

Expected: pass if the existing local recovery edits are correct; fail if finalization still relies on stale ORM state.

- [ ] **Step 3: If the test fails, fix finalization to reload by ID**

In `backend/app/jobs/runner.py`, ensure the `finally` block in `_run_job_thread` uses this pattern:

```python
            finally:
                _release_lock_safe()
                self._cancel_flags.pop(job_id, None)
                job = db.get(Job, job_id)
                project = db.get(Project, job.project_id) if job else None
```

Also ensure exception handlers call `_rollback(db)` before setting terminal state:

```python
            except Exception as e:
                _rollback(db)
                job = db.get(Job, job_id)
                project = db.get(Project, job.project_id) if job else None
                if job and project:
                    project.status = ProjectStatus.FAILED.value
                    project.error_message = str(e)
                    job.status = JobStatus.FAILED.value
                    job.error_message = str(e)
                    job.finished_at = _utcnow()
                    _log(db, job, str(e), LogLevel.ERROR)
```

- [ ] **Step 4: Run audit fix tests**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_audit_fixes.py
```

Expected: all tests in the file pass quickly.

- [ ] **Step 5: Commit**

```bash
git add backend/app/jobs/runner.py backend/tests/test_audit_fixes.py
git commit -m "Harden pipeline job finalization"
```

## Task 6: Skip Existing Silent-Audio Helper Clips

**Files:**
- Modify: `backend/app/services/ffmpeg_engine.py`
- Add: `backend/tests/test_audio_resume.py`

- [ ] **Step 1: Write failing test for existing helper clip reuse**

Create `backend/tests/test_audio_resume.py`:

```python
from pathlib import Path
from unittest.mock import patch

from app.services import ffmpeg_engine


def test_ensure_audio_clip_reuses_existing_valid_helper(tmp_path, monkeypatch):
    clip = tmp_path / "clip.mp4"
    clip.write_bytes(b"video")
    work_dir = tmp_path / "_audio"
    helper = work_dir / "clip_with_audio.mp4"
    work_dir.mkdir()
    helper.write_bytes(b"helper")

    def fake_has_audio(path: Path) -> bool:
        return path == helper

    monkeypatch.setattr(ffmpeg_engine, "has_audio_stream", fake_has_audio)
    monkeypatch.setattr(ffmpeg_engine, "is_valid_media", lambda path: path == helper)

    with patch("app.services.ffmpeg_engine.run_ffmpeg") as run_ffmpeg:
        result = ffmpeg_engine.ensure_audio_clip(clip, work_dir)

    run_ffmpeg.assert_not_called()
    assert result == helper
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_audio_resume.py
```

Expected before the fix: failure because `run_ffmpeg` is called even though the helper exists.

- [ ] **Step 3: Implement helper clip skip**

In `backend/app/services/ffmpeg_engine.py`, replace `ensure_audio_clip` with:

```python
def ensure_audio_clip(clip_path: Path, work_dir: Path) -> Path:
    if has_audio_stream(clip_path):
        return clip_path
    work_dir.mkdir(parents=True, exist_ok=True)
    out = work_dir / f"{clip_path.stem}_with_audio.mp4"
    if out.exists() and is_valid_media(out) and has_audio_stream(out):
        return out
    run_ffmpeg(build_silent_audio_cmd(clip_path, out))
    return out
```

- [ ] **Step 4: Run audio resume tests and concat tests**

Run:

```bash
cd backend
./.venv/bin/pytest -vv tests/test_audio_resume.py tests/test_ffmpeg_concat.py
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/ffmpeg_engine.py backend/tests/test_audio_resume.py
git commit -m "Reuse valid silent audio helper clips"
```

## Task 7: Final Backend Verification

**Files:**
- No required code changes unless verification exposes a root cause.

- [ ] **Step 1: Run the full backend test suite**

Run:

```bash
cd backend
./.venv/bin/pytest -q
```

Expected: all backend tests pass without hanging.

- [ ] **Step 2: If the full suite hangs, isolate the next hanging test**

Run:

```bash
cd backend
timeout 30 ./.venv/bin/pytest -vv -x
```

Expected: output identifies the next test name before timeout. Investigate that test with the systematic-debugging workflow before changing code.

- [ ] **Step 3: Run frontend build only if route/API shapes changed**

Run:

```bash
cd frontend
npm run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 4: Review final diff**

Run:

```bash
git diff --stat HEAD
git diff -- backend/app/api/routes.py backend/app/jobs/runner.py backend/app/services/youtube_sourcer.py backend/app/services/ffmpeg_engine.py backend/tests/test_audit_fixes.py backend/tests/test_youtube_sourcer.py backend/tests/test_stage_resume.py
```

Expected: changes are limited to the backend pipeline slice and tests.

- [ ] **Step 5: Commit final verification fixes if any were needed**

If verification required follow-up changes:

```bash
git add backend frontend
git commit -m "Verify backend pipeline fixes"
```

If no follow-up changes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: gated state validation is covered by Task 1; candidate subprocess reduction by Task 2; resumable stages by Tasks 3, 4, and 6; job lifecycle and lock recovery by Task 5; verification by Task 7.
- Scope: this plan does not replace the storage layer, job backend, frontend UI, or media pipeline architecture.
- Ambiguity: final-render skipping and aggressive media-stage fusion are intentionally excluded from this first slice because they need stronger input fingerprinting and manual video verification.
