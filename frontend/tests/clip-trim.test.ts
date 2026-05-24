import assert from "node:assert/strict"
import test from "node:test"
import {
  clampClipStart,
  effectiveClipDuration,
  maxClipStart,
  usesHeatmapStart,
} from "../src/lib/clip-trim.ts"

test("effectiveClipDuration prefers per-song override", () => {
  assert.equal(effectiveClipDuration({ clip_time: 12 }, 10), 12)
  assert.equal(effectiveClipDuration({ clip_time: null }, 10), 10)
})

test("usesHeatmapStart is true when cut_start_time is unset", () => {
  assert.equal(usesHeatmapStart({ cut_start_time: null }), true)
  assert.equal(usesHeatmapStart({ cut_start_time: 30 }), false)
})

test("maxClipStart keeps the clip inside the source duration", () => {
  assert.equal(maxClipStart(180, 10), 170)
  assert.equal(maxClipStart(8, 10), 0)
})

test("clampClipStart bounds manual start times", () => {
  assert.equal(clampClipStart(-5, 180, 10), 0)
  assert.equal(clampClipStart(200, 180, 10), 170)
  assert.equal(clampClipStart(30, 180, 10), 30)
})
