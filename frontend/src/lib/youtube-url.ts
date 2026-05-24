const YOUTUBE_ID =
	/(?:youtube\.com\/watch\?(?:[^&]*&)*v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/;
const STANDALONE_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYoutubeId(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const match = trimmed.match(YOUTUBE_ID);
	if (match) return match[1];
	if (STANDALONE_ID.test(trimmed)) return trimmed;
	return null;
}

export function isValidYoutubeUrl(value: string): boolean {
	return parseYoutubeId(value) !== null;
}

export function youtubeWatchUrl(value: string): string | null {
	const id = parseYoutubeId(value);
	return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
