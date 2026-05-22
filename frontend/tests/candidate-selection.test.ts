import assert from "node:assert/strict"
import test from "node:test"
import { nextUnselectedSongId } from "../src/lib/candidate-selection.ts"

test("advances to the next unselected song after saving the current pick", () => {
  const songs = [
    { id: "song-1", selected_candidate_id: null },
    { id: "song-2", selected_candidate_id: null },
    { id: "song-3", selected_candidate_id: "candidate-3" },
  ]

  assert.equal(nextUnselectedSongId(songs, "song-1"), "song-2")
})

test("does not advance back to the song that was just selected", () => {
  const songs = [
    { id: "song-1", selected_candidate_id: null },
    { id: "song-2", selected_candidate_id: "candidate-2" },
  ]

  assert.equal(nextUnselectedSongId(songs, "song-1"), null)
})
