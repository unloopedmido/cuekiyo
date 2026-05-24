import assert from "node:assert/strict";
import test from "node:test";
import {
	deselectAllThemes,
	selectAllThemes,
} from "../src/lib/song-selection-actions.ts";

const themes = [{ id: "a" }, { id: "b" }, { id: "c" }] as { id: string }[];

test("selectAllThemes respects max cap", () => {
	assert.deepEqual(selectAllThemes(themes, 2), new Set(["a", "b"]));
});

test("selectAllThemes unlimited selects all filtered", () => {
	assert.deepEqual(selectAllThemes(themes, null), new Set(["a", "b", "c"]));
});

test("deselectAllThemes clears selection", () => {
	assert.deepEqual(deselectAllThemes(), new Set());
});
