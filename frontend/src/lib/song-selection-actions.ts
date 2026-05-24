export function selectAllThemes<T extends { id: string }>(
	themes: T[],
	maxCount: number | null,
): Set<string> {
	const ids = themes.map((t) => t.id);
	if (maxCount === null) return new Set(ids);
	return new Set(ids.slice(0, maxCount));
}

export function deselectAllThemes(): Set<string> {
	return new Set();
}
