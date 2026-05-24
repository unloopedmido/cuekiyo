import type { OverlayConfig } from "../types.ts";
import type { ProjectDefaults } from "./projectDefaults.ts";

export interface ProjectTemplate {
	id: string;
	name: string;
	createdAt: string;
	values: ProjectDefaults & {
		sourceMode?: "auto" | "manual";
		overlayConfig?: OverlayConfig;
		fadeSeconds?: number;
		unlimitedSongs?: boolean;
	};
}

const STORAGE_KEY = "amv-project-templates-v1";

function readTemplates(): ProjectTemplate[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as ProjectTemplate[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeTemplates(templates: ProjectTemplate[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
	} catch {
		/* quota / private browsing */
	}
}

export function listTemplates(): ProjectTemplate[] {
	return readTemplates().toSorted(
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
}

export function saveTemplate(input: {
	name: string;
	values: ProjectTemplate["values"];
}): ProjectTemplate {
	const template: ProjectTemplate = {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		createdAt: new Date().toISOString(),
		values: input.values,
	};
	const next = [...readTemplates(), template];
	writeTemplates(next);
	return template;
}

export function deleteTemplate(id: string): void {
	writeTemplates(readTemplates().filter((t) => t.id !== id));
}

export function applyTemplate(
	id: string,
	fallback: ProjectDefaults,
): ProjectTemplate["values"] {
	const found = listTemplates().find((t) => t.id === id);
	return found ? { ...fallback, ...found.values } : fallback;
}

export function buildTemplateValues(
	defaults: ProjectDefaults & {
		sourceMode?: "auto" | "manual";
		overlayConfig?: OverlayConfig;
		fadeSeconds?: number;
		unlimitedSongs?: boolean;
	},
): ProjectTemplate["values"] {
	return { ...defaults };
}
