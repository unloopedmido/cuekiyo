import {
	DEFAULT_OVERLAY_CONFIG,
	mergeOverlayConfig,
} from "@/lib/overlay-config";
import type { OverlayConfig } from "@/types";

export interface ProjectDefaults {
	songsCount: number;
	songTypes: string[];
	clipTime: number;
	encoder: string;
	audioNormalize: boolean;
	sourceMode: "auto" | "manual";
	overlayConfig: OverlayConfig;
	unlimitedSongs: boolean;
}

const STORAGE_KEY = "amv-project-defaults";

export const DEFAULT_PROJECT_DEFAULTS: ProjectDefaults = {
	songsCount: 5,
	songTypes: ["opening"],
	clipTime: 10,
	encoder: "auto",
	audioNormalize: true,
	sourceMode: "auto",
	overlayConfig: DEFAULT_OVERLAY_CONFIG,
	unlimitedSongs: false,
};

export function loadProjectDefaults(): ProjectDefaults {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_PROJECT_DEFAULTS;
		const parsed = JSON.parse(raw) as Partial<ProjectDefaults>;
		return {
			songsCount: parsed.songsCount ?? DEFAULT_PROJECT_DEFAULTS.songsCount,
			songTypes: parsed.songTypes?.length
				? parsed.songTypes
				: DEFAULT_PROJECT_DEFAULTS.songTypes,
			clipTime: parsed.clipTime ?? DEFAULT_PROJECT_DEFAULTS.clipTime,
			encoder: parsed.encoder ?? DEFAULT_PROJECT_DEFAULTS.encoder,
			audioNormalize:
				parsed.audioNormalize ?? DEFAULT_PROJECT_DEFAULTS.audioNormalize,
			sourceMode: parsed.sourceMode ?? DEFAULT_PROJECT_DEFAULTS.sourceMode,
			overlayConfig: mergeOverlayConfig(parsed.overlayConfig ?? {}),
			unlimitedSongs:
				parsed.unlimitedSongs ?? DEFAULT_PROJECT_DEFAULTS.unlimitedSongs,
		};
	} catch {
		return DEFAULT_PROJECT_DEFAULTS;
	}
}

export function saveProjectDefaults(defaults: ProjectDefaults): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
}
