import { type FormEvent, useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useToast } from "../hooks/useToast";
import { errorToMessage } from "../lib/errors";
import { loadProjectDefaults } from "../lib/projectDefaults";

type AnimePick = {
	mal_id: number;
	title: string;
	title_english?: string;
	image_url?: string;
	year?: number;
};

export default function ProjectSetup() {
	const nav = useNavigate();
	const { addToast } = useToast();
	const [title, setTitle] = useState("");
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<AnimePick[]>([]);
	const [animes, setAnimes] = useState<AnimePick[]>([]);
	const [songTypes, setSongTypes] = useState<string[]>(["opening"]);
	const [songsCount, setSongsCount] = useState(5);
	const [clipTime, setClipTime] = useState(10);
	const [encoder, setEncoder] = useState("auto");
	const [audioNorm, setAudioNorm] = useState(true);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [searching, setSearching] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [touchedTitle, setTouchedTitle] = useState(false);
	const [touchedAnimes, setTouchedAnimes] = useState(false);
	const [triedSubmit, setTriedSubmit] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	useEffect(() => {
		const defaults = loadProjectDefaults();
		setSongTypes(defaults.songTypes);
		setSongsCount(defaults.songsCount);
		setClipTime(defaults.clipTime);
		setEncoder(defaults.encoder);
		setAudioNorm(defaults.audioNormalize);
	}, []);

	const titleError = !title.trim() && (touchedTitle || triedSubmit);
	const animeError = animes.length === 0 && (touchedAnimes || triedSubmit);

	const search = async () => {
		if (query.trim().length < 2) return;
		setError(null);
		setSearching(true);
		try {
			const response = await api.searchAnime(query.trim());
			setResults(response);
			setHasSearched(true);
		} catch (e) {
			setError(errorToMessage(e));
		} finally {
			setSearching(false);
		}
	};

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (!title.trim() || animes.length === 0 || songTypes.length === 0) {
			setTriedSubmit(true);
			return;
		}
		setTriedSubmit(true);
		setLoading(true);
		setError(null);
		try {
			const project = await api.createProject({
				title: title.trim(),
				animes: animes.map((anime, index) => ({
					anime_mal_id: anime.mal_id,
					anime_name: anime.title,
					display_order: index,
				})),
				songs_count: songsCount,
				song_types: songTypes,
				clip_time: clipTime,
				encoder,
				audio_normalize: audioNorm,
			});
			await api.loadThemes(project.id);
			addToast("Project created and themes loading", "success");
			nav(`/projects/${project.id}`);
		} catch (e) {
			const msg = errorToMessage(e);
			setError(msg);
			addToast(msg, "error");
		} finally {
			setLoading(false);
		}
	};

	const toggleSongType = (type: string, checked: boolean) => {
		setSongTypes((current) =>
			checked
				? Array.from(new Set([...current, type]))
				: current.filter((item) => item !== type),
		);
	};

	return (
		<form
			onSubmit={submit}
			className="max-w-3xl"
		>
			<section>
				<header className="mb-8">
					<h1 className="type-headline">New project</h1>
				</header>

				<div className="space-y-6">
					<div>
						<label
							className="mb-2 block text-sm font-medium"
							htmlFor="project-title"
						>
							Project title
						</label>
						<input
							id="project-title"
							className="w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							onBlur={() => setTouchedTitle(true)}
							placeholder="Spring openings cut"
							aria-invalid={!!titleError}
							aria-describedby="title-error"
						/>
						{titleError && (
							<p id="title-error" className="text-xs text-danger mt-1.5">
								Add a project title.
							</p>
						)}
					</div>

					<div>
						<label
							className="mb-2 block text-sm font-medium"
							htmlFor="anime-search"
						>
							Anime
						</label>
						<div className="flex gap-2">
							<input
								id="anime-search"
								className="min-w-0 flex-1 rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm"
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setHasSearched(false);
								}}
								onBlur={() => setTouchedAnimes(true)}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										void search();
									}
								}}
								placeholder="Search by title"
								aria-invalid={!!animeError}
								aria-describedby="anime-error"
							/>
							<button
								type="button"
								onClick={() => void search()}
								disabled={searching}
								className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio disabled:opacity-45 transition-opacity duration-150 hover:opacity-90 active:opacity-80"
							>
								<Search size={16} aria-hidden="true" />
								{searching ? "Searching..." : "Search"}
							</button>
						</div>
						{results.length > 0 && (
							<div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-panel/80 p-2">
								{results.map((result) => (
									<button
										key={result.mal_id}
										type="button"
										className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-white/[0.06]"
										onClick={() => {
											if (
												!animes.some((anime) => anime.mal_id === result.mal_id)
											) {
												setAnimes([...animes, result]);
											}
										}}
									>
										{result.image_url ? (
											<img
												src={result.image_url}
												alt=""
												className="h-14 w-10 shrink-0 rounded-md object-cover"
												loading="lazy"
											/>
										) : (
											<div className="h-14 w-10 shrink-0 rounded-md bg-white/[0.04]" />
										)}
										<div className="min-w-0 flex-1">
											<span className="block truncate">
												{result.title_english || result.title}
											</span>
											{result.year && (
												<span className="block truncate text-xs text-muted">
													{result.year}
												</span>
											)}
										</div>
									</button>
								))}
							</div>
						)}
						{hasSearched && results.length === 0 && (
							<p className="mt-3 text-sm text-muted">
								No anime found for &ldquo;{query}&rdquo;. Try a different title.
							</p>
						)}
						{animeError && (
							<p id="anime-error" className="text-xs text-danger mt-1.5">
								Search for and select at least one anime.
							</p>
						)}
						<div className="mt-3 flex flex-wrap gap-2">
							{animes.map((anime) => (
								<span
									key={anime.mal_id}
									className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-2 py-1 text-sm"
								>
									{anime.image_url && (
										<img
											src={anime.image_url}
											alt=""
											className="h-6 w-4 rounded-sm object-cover"
										/>
									)}
									<span>{anime.title}</span>
									<button
										type="button"
										aria-label={`Remove ${anime.title}`}
										className="grid size-11 place-items-center transition-colors duration-150 hover:text-danger"
										onClick={() =>
											setAnimes(
												animes.filter((item) => item.mal_id !== anime.mal_id),
											)
										}
									>
										<X size={14} aria-hidden="true" />
									</button>
								</span>
							))}
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div className="py-4">
							<span className="text-sm font-medium" id="song-types-label">
								Song types
							</span>
							<div
								className="mt-3 flex gap-3 text-sm text-muted"
								role="group"
								aria-labelledby="song-types-label"
							>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={songTypes.includes("opening")}
										onChange={(event) =>
											toggleSongType("opening", event.target.checked)
										}
									/>
									Openings
								</label>
								<label className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={songTypes.includes("ending")}
										onChange={(event) =>
											toggleSongType("ending", event.target.checked)
										}
									/>
									Endings
								</label>
							</div>
							{triedSubmit && songTypes.length === 0 && (
								<p className="text-xs text-danger mt-1.5">
									Select at least one song type.
								</p>
							)}
						</div>
						<div className="py-4">
							<label htmlFor="songs-count" className="text-sm font-medium">
								Songs
							</label>
							<input
								id="songs-count"
								type="number"
								min={1}
								max={50}
								className="mt-3 w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm"
								value={songsCount}
								onChange={(event) => setSongsCount(Number(event.target.value))}
							/>
						</div>
						<div className="py-4">
							<label htmlFor="clip-time" className="text-sm font-medium">
								Clip length (s)
							</label>
							<input
								id="clip-time"
								type="number"
								min={3}
								className="mt-3 w-full rounded-xl border border-white/10 bg-panel px-3 py-2 text-sm"
								value={clipTime}
								onChange={(event) => setClipTime(Number(event.target.value))}
							/>
						</div>
					</div>

					<section className="border-t border-white/10 pt-4">
						<button
							type="button"
							className="flex w-full items-center justify-between px-4 py-4 text-left"
							onClick={() => setAdvancedOpen(!advancedOpen)}
						>
							<span className="inline-flex items-center gap-2 text-sm font-medium">
								<SlidersHorizontal size={16} aria-hidden="true" />
								Export defaults
							</span>
							<span className="text-xs text-muted">
								{advancedOpen ? "Hide" : "Show"}
							</span>
						</button>
						{advancedOpen && (
							<div className="grid gap-4 border-t border-white/10 p-4 md:grid-cols-2">
								<label className="text-sm">
									Encoder
									<select
										className="mt-2 w-full rounded-xl border border-white/10 bg-panel px-3 py-2"
										value={encoder}
										onChange={(event) => setEncoder(event.target.value)}
									>
										<option value="auto">Auto-detect</option>
										<option value="libx264">Software H.264</option>
										<option value="h264_nvenc">NVIDIA H.264</option>
										<option value="hevc_nvenc">NVIDIA HEVC</option>
									</select>
								</label>
								<div>
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={audioNorm}
											onChange={(event) => setAudioNorm(event.target.checked)}
										/>
										Normalize audio
									</label>
								</div>
							</div>
						)}
					</section>

					{error && (
						<p
							className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
							aria-live="polite"
						>
							{error}
						</p>
					)}

					<div className="mt-6 flex justify-end">
						<button
							type="submit"
							disabled={
								!title.trim() ||
								animes.length === 0 ||
								songTypes.length === 0 ||
								loading
							}
							className="rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio disabled:opacity-45 transition-opacity duration-150 hover:opacity-90 active:opacity-80"
						>
							{loading ? "Creating..." : "Create and load themes"}
						</button>
					</div>
				</div>
			</section>
		</form>
	);
}
