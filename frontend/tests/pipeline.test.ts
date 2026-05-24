import assert from "node:assert/strict";
import test from "node:test";
import {
  PIPELINE_STAGES,
  getProjectAction,
  getProjectStage,
  getStatusCopy,
  isSettingsEditable,
  isUserGatedStatus,
} from "../src/pipeline.ts";

test("maps every project status into the persistent pipeline spine", () => {
  assert.deepEqual(
    PIPELINE_STAGES.map((stage) => stage.id),
    [
      "setup",
      "themes",
      "songs",
      "candidates",
      "clip-trim",
      "processing",
      "order",
      "render",
      "output",
    ],
  );

  assert.equal(getProjectStage("DRAFT").id, "setup");
  assert.equal(getProjectStage("SONG_SELECTION").id, "songs");
  assert.equal(getProjectStage("AWAITING_CANDIDATES").id, "candidates");
  assert.equal(getProjectStage("AWAITING_CLIP_TRIM").id, "clip-trim");
  assert.equal(getProjectStage("DOWNLOADING").id, "processing");
  assert.equal(getProjectStage("AWAITING_RENDER_ORDER").id, "order");
  assert.equal(getProjectStage("COMPLETED").id, "output");
});

test("describes statuses with creator-facing copy and next actions", () => {
  assert.equal(getStatusCopy("LOADING_THEMES").label, "Loading themes");
  assert.equal(getStatusCopy("PROBING_NORMALIZING").label, "Preparing clips");
  assert.equal(getStatusCopy("AWAITING_CANDIDATES").tone, "attention");
  assert.equal(getStatusCopy("AWAITING_CLIP_TRIM").label, "Trim clips");
  assert.equal(getProjectAction("SONG_SELECTION"), "Review songs");
  assert.equal(getProjectAction("AWAITING_CLIP_TRIM"), "Trim clips");
  assert.equal(getProjectAction("FAILED"), "Review issue");
});

test("identifies only taste checkpoints as user gated", () => {
  assert.equal(isUserGatedStatus("SONG_SELECTION"), true);
  assert.equal(isUserGatedStatus("AWAITING_CANDIDATES"), true);
  assert.equal(isUserGatedStatus("AWAITING_CLIP_TRIM"), true);
  assert.equal(isUserGatedStatus("AWAITING_RENDER_ORDER"), true);
  assert.equal(isUserGatedStatus("RENDERING"), false);
});

test("allows settings edits only in draft and song selection", () => {
  assert.equal(isSettingsEditable("DRAFT"), true);
  assert.equal(isSettingsEditable("SONG_SELECTION"), true);
  assert.equal(isSettingsEditable("AWAITING_CANDIDATES"), false);
  assert.equal(isSettingsEditable("COMPLETED"), false);
});
