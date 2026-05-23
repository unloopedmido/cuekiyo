/** Creator-facing labels shared across nav, titles, and breadcrumbs. */
export const NAV = {
	projects: "Projects",
	newCompilation: "New project",
	settings: "Settings",
} as const;

export function formatSongType(type: string): string {
	if (type === "opening") return "Opening";
	if (type === "ending") return "Ending";
	return type.charAt(0).toUpperCase() + type.slice(1);
}

const ENCODER_LABELS: Record<string, string> = {
	auto: "Auto encoder",
	libx264: "H.264 software",
	h264_nvenc: "NVENC H.264",
	hevc_nvenc: "NVENC HEVC",
};

export function formatEncoder(encoder: string): string {
	return ENCODER_LABELS[encoder] ?? encoder;
}
