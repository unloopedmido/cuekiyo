import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Add01Icon,
	Cancel01Icon,
	Search01Icon,
} from "@hugeicons/core-free-icons";
import { api } from "@/api";
import { errorToMessage } from "@/lib/errors";
import { loadProjectDefaults } from "@/lib/projectDefaults";
import { PageHeader } from "@/components/page-header";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NAV } from "@/lib/nav";

type AnimePick = {
	mal_id: number;
	title: string;
	title_english?: string;
	image_url?: string;
	year?: number;
};

export default function ProjectSetup() {
	const nav = useNavigate();
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
			setResults(await api.searchAnime(query.trim()));
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
			toast.success("Compilation created");
			nav(`/projects/${project.id}`);
		} catch (e) {
			const msg = errorToMessage(e);
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-8">
			<PageHeader
				title={NAV.newCompilation}
				description="Name your edit, add anime, and choose how many songs to include. Everything else can stay on defaults."
			/>

			<form onSubmit={submit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
				<FieldGroup className="gap-8">
					<Field data-invalid={titleError || undefined}>
						<FieldLabel htmlFor="project-title">Compilation title</FieldLabel>
						<Input
							id="project-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onBlur={() => setTouchedTitle(true)}
							placeholder="Winter 2024 openings"
							aria-invalid={titleError}
							className="max-w-lg"
						/>
						{titleError && (
							<FieldDescription className="text-destructive">
								Add a title.
							</FieldDescription>
						)}
					</Field>

					<Field data-invalid={animeError || undefined}>
						<FieldLabel htmlFor="anime-search">Anime search</FieldLabel>
						<InputGroup className="h-9 max-w-lg">
							<InputGroupAddon align="inline-start">
								<HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
							</InputGroupAddon>
							<InputGroupInput
								id="anime-search"
								value={query}
								onChange={(e) => {
									setQuery(e.target.value);
									setHasSearched(false);
								}}
								onBlur={() => setTouchedAnimes(true)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										void search();
									}
								}}
								placeholder="Search anime by title"
								aria-invalid={animeError}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton onClick={() => void search()} disabled={searching}>
									{searching ? "..." : "Search"}
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						{hasSearched && results.length === 0 && (
							<FieldDescription>No results for that query.</FieldDescription>
						)}
						{animeError && (
							<FieldDescription className="text-destructive">
								Add at least one anime.
							</FieldDescription>
						)}
						{results.length > 0 && (
							<ScrollArea className="mt-2 h-44 max-w-lg rounded-xl border border-border/80">
								<ul className="flex flex-col p-1">
									{results.map((result) => (
										<li key={result.mal_id}>
											<Button
												type="button"
												variant="ghost"
												className="h-auto w-full justify-start gap-3 px-2 py-2"
												onClick={() => {
													if (!animes.some((a) => a.mal_id === result.mal_id)) {
														setAnimes([...animes, result]);
													}
												}}
											>
												{result.image_url ? (
													<img
														src={result.image_url}
														alt=""
														className="size-10 rounded object-cover"
													/>
												) : (
													<span className="size-10 rounded bg-muted" />
												)}
												<span className="truncate text-left text-sm">
													{result.title_english || result.title}
												</span>
											</Button>
										</li>
									))}
								</ul>
							</ScrollArea>
						)}
					</Field>

					<Separator />

					<div className="grid gap-6 sm:grid-cols-2">
						<Field>
							<FieldLabel>Song types</FieldLabel>
							<ToggleGroup
								type="multiple"
								value={songTypes}
								onValueChange={setSongTypes}
								variant="outline"
							>
								<ToggleGroupItem value="opening">Opening</ToggleGroupItem>
								<ToggleGroupItem value="ending">Ending</ToggleGroupItem>
							</ToggleGroup>
						</Field>
						<Field>
							<FieldLabel htmlFor="songs-count">Target count</FieldLabel>
							<Input
								id="songs-count"
								type="number"
								min={1}
								max={50}
								value={songsCount}
								onChange={(e) => setSongsCount(Number(e.target.value))}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="clip-time">Clip length (s)</FieldLabel>
							<Input
								id="clip-time"
								type="number"
								min={3}
								value={clipTime}
								onChange={(e) => setClipTime(Number(e.target.value))}
							/>
						</Field>
					</div>

					<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
						<CollapsibleTrigger asChild>
							<Button type="button" variant="ghost" className="px-0">
								Encoder & audio {advancedOpen ? "↑" : "↓"}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-4 grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="encoder">Encoder</FieldLabel>
								<Select value={encoder} onValueChange={setEncoder}>
									<SelectTrigger id="encoder">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="auto">Auto</SelectItem>
										<SelectItem value="libx264">H.264 software</SelectItem>
										<SelectItem value="h264_nvenc">NVENC H.264</SelectItem>
										<SelectItem value="hevc_nvenc">NVENC HEVC</SelectItem>
									</SelectContent>
								</Select>
							</Field>
							<Field orientation="horizontal">
								<Switch
									id="audio-norm"
									checked={audioNorm}
									onCheckedChange={setAudioNorm}
								/>
								<FieldLabel htmlFor="audio-norm">Normalize audio</FieldLabel>
							</Field>
						</CollapsibleContent>
					</Collapsible>

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						type="submit"
						size="lg"
						className="w-fit"
						disabled={
							!title.trim() ||
							animes.length === 0 ||
							songTypes.length === 0 ||
							loading
						}
					>
						{loading && <LoadingSpinner data-icon="inline-start" />}
						Create & load themes
					</Button>
				</FieldGroup>

				<aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
					<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Selected anime ({animes.length})
					</p>
					{animes.length === 0 ? (
						<Empty className="border border-dashed border-border/80 bg-muted/15 py-8">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
								</EmptyMedia>
								<EmptyTitle className="text-sm">Add anime next</EmptyTitle>
								<EmptyDescription className="text-xs">
									Search by title, pick results, and posters show up here. You need at
									least one show before creating.
								</EmptyDescription>
							</EmptyHeader>
							<ol className="mt-2 list-inside list-decimal text-left text-xs text-muted-foreground">
								<li>Name the compilation</li>
								<li>Search and add anime</li>
								<li>Choose openings, endings, or both</li>
							</ol>
						</Empty>
					) : (
						<ul className="flex flex-col gap-2">
							{animes.map((anime) => (
								<li
									key={anime.mal_id}
									className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/20 p-2"
								>
									{anime.image_url && (
										<img
											src={anime.image_url}
											alt=""
											className="size-12 rounded object-cover"
										/>
									)}
									<span className="min-w-0 flex-1 truncate text-sm font-medium">
										{anime.title}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="shrink-0"
										aria-label={`Remove ${anime.title}`}
										onClick={() =>
											setAnimes(animes.filter((a) => a.mal_id !== anime.mal_id))
										}
									>
										<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
									</Button>
								</li>
							))}
						</ul>
					)}
				</aside>
			</form>
		</div>
	);
}
