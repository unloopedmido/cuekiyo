import assert from "node:assert/strict";
import test from "node:test";
import {
	applyTemplate,
	deleteTemplate,
	listTemplates,
	saveTemplate,
} from "../src/lib/project-templates.ts";

const DEFAULT_PROJECT_DEFAULTS = {
	songsCount: 5,
	songTypes: ["opening"],
	clipTime: 10,
	encoder: "auto",
	audioNormalize: true,
	sourceMode: "auto" as const,
	overlayConfig: {
		enabled: true,
		style: "default" as const,
		position: "bottom" as const,
		show_anime_name: true,
		show_song_line: true,
		show_meta_line: true,
	},
};

const store = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
	value: {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => {
			store.clear();
		},
	},
	writable: true,
});

test("save and apply template merges defaults", () => {
	store.clear();
	saveTemplate({
		name: "Short OP mix",
		values: { ...DEFAULT_PROJECT_DEFAULTS, songsCount: 3, clipTime: 8 },
	});
	const templates = listTemplates();
	assert.equal(templates.length, 1);
	const applied = applyTemplate(templates[0]!.id, DEFAULT_PROJECT_DEFAULTS);
	assert.equal(applied.songsCount, 3);
	assert.equal(applied.clipTime, 8);
});

test("deleteTemplate removes saved template", () => {
	store.clear();
	const saved = saveTemplate({
		name: "To delete",
		values: DEFAULT_PROJECT_DEFAULTS,
	});
	assert.equal(listTemplates().length, 1);
	deleteTemplate(saved.id);
	assert.equal(listTemplates().length, 0);
});

test("applyTemplate returns fallback for unknown id", () => {
	store.clear();
	const applied = applyTemplate("missing", DEFAULT_PROJECT_DEFAULTS);
	assert.deepEqual(applied, DEFAULT_PROJECT_DEFAULTS);
});
