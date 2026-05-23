export interface AppSettings {
	animeMetadataProvider: "jikan" | "anilist";
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
	animeMetadataProvider: "jikan",
};

const STORAGE_KEY = "amv-app-settings";

export function loadAppSettingsCache(): AppSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_APP_SETTINGS;
		const parsed = JSON.parse(raw) as Partial<AppSettings>;
		return {
			animeMetadataProvider:
				parsed.animeMetadataProvider ?? DEFAULT_APP_SETTINGS.animeMetadataProvider,
		};
	} catch {
		return DEFAULT_APP_SETTINGS;
	}
}

export function saveAppSettingsCache(settings: AppSettings): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
