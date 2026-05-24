import assert from "node:assert/strict";
import test from "node:test";
import { animeDisplayTitle } from "../src/lib/anime-pick.ts";

test("animeDisplayTitle prefers English title", () => {
	assert.equal(
		animeDisplayTitle({
			mal_id: 1,
			title: "Shingeki no Kyojin",
			title_english: "Attack on Titan",
		}),
		"Attack on Titan",
	);
});

test("animeDisplayTitle falls back to native title", () => {
	assert.equal(
		animeDisplayTitle({ mal_id: 2, title: "Monogatari" }),
		"Monogatari",
	);
});
