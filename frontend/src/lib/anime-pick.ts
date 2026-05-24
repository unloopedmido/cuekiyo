export type AnimePick = {
	mal_id: number;
	title: string;
	title_english?: string;
	image_url?: string;
	year?: number;
};

export function animeDisplayTitle(anime: AnimePick): string {
	return anime.title_english || anime.title;
}
