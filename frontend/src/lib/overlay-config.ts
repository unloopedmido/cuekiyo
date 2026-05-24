import type { OverlayConfig } from "@/types";

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
	enabled: true,
	style: "default",
	position: "bottom",
	show_anime_name: true,
	show_song_line: true,
	show_meta_line: true,
	accent_color: "#a3e635",
	title_color: "#ffffff",
	subtitle_color: "rgba(255,255,255,0.88)",
	meta_color: "rgba(255,255,255,0.65)",
	font_scale: "default",
};

export function rgbaWhiteOpacity(color: string): number {
	const match = color.match(/rgba?\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/);
	return match ? Number.parseFloat(match[1]) : 0.88;
}

export function whiteRgba(opacity: number): string {
	return `rgba(255,255,255,${opacity.toFixed(2)})`;
}

export function mergeOverlayConfig(
	partial: Partial<OverlayConfig>,
): OverlayConfig {
	return { ...DEFAULT_OVERLAY_CONFIG, ...partial };
}
