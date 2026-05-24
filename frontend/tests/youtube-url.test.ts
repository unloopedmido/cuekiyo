import assert from "node:assert/strict";
import test from "node:test";
import { isValidYoutubeUrl, youtubeWatchUrl } from "../src/lib/youtube-url.ts";

test("isValidYoutubeUrl accepts common formats", () => {
	assert.equal(isValidYoutubeUrl("https://youtu.be/dQw4w9WgXcQ"), true);
	assert.equal(isValidYoutubeUrl("not-a-url"), false);
});

test("youtubeWatchUrl normalizes id", () => {
	assert.equal(
		youtubeWatchUrl("https://youtu.be/dQw4w9WgXcQ"),
		"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
	);
});
