import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { errorToMessage } from "@/lib/errors";
import type { Project, ThemeSong } from "@/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FieldGroup } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { formatSongType } from "@/lib/nav";

export function SongSelection({
	project,
	onDone,
}: {
	project: Project;
	onDone: () => void;
}) {
	const [themes, setThemes] = useState<ThemeSong[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [confirmFewerOpen, setConfirmFewerOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	useEffect(() => {
		setLoading(true);
		api
			.listThemes(project.id)
			.then(setThemes)
			.catch((e) => {
				const msg = errorToMessage(e);
				setError(msg);
				toast.error(msg);
			})
			.finally(() => setLoading(false));
	}, [project.id]);

	const toggle = (id: string, checked: boolean) => {
		const next = new Set(selected);
		if (checked) {
			if (next.size < project.songs_count) next.add(id);
		} else {
			next.delete(id);
		}
		setSelected(next);
	};

	const submit = async (confirmFewer: boolean) => {
		setSubmitting(true);
		try {
			const picks = themes.filter((t) => selected.has(t.id));
			const animeMap = Object.fromEntries(
				project.animes.map((a) => [a.anime_mal_id, a.anime_name]),
			);
			await api.selectSongs(project.id, {
				confirm_fewer: confirmFewer,
				songs: picks.map((t) => ({
					anime_mal_id: t.anime_mal_id,
					anime_name: animeMap[t.anime_mal_id] ?? "Unknown",
					song_type: t.song_type,
					song_number: t.song_number,
					song_title: t.song_title,
					artist: t.artist,
					raw_theme_text: t.raw_text,
				})),
			});
			toast.success(`Saved ${picks.length} songs`);
			onDone();
		} catch (e) {
			toast.error(errorToMessage(e));
		} finally {
			setSubmitting(false);
			setConfirmFewerOpen(false);
		}
	};

	const handleSubmit = () => {
		if (selected.size === project.songs_count) void submit(false);
		else if (selected.size > 0) setConfirmFewerOpen(true);
	};

	const queryLower = query.trim().toLowerCase();
	const filtered = queryLower
		? themes.filter(
				(t) =>
					t.song_title.toLowerCase().includes(queryLower) ||
					(t.artist ?? "").toLowerCase().includes(queryLower),
			)
		: themes;

	const animeNames = Object.fromEntries(
		project.animes.map((a) => [a.anime_mal_id, a.anime_name]),
	);

	const grouped = filtered.reduce<Record<string, ThemeSong[]>>((acc, t) => {
		const key = `${t.anime_mal_id}-${t.song_type}`;
		(acc[key] ??= []).push(t);
		return acc;
	}, {});

	if (loading) {
		return (
			<div className="flex flex-col gap-3">
				<Skeleton className="h-9 w-full max-w-sm" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h2 className="font-heading text-xl font-semibold">Choose songs</h2>
				<p className="text-sm text-muted-foreground">
					Pick up to {project.songs_count} tracks. {selected.size} selected.
				</p>
			</div>

			<InputGroup className="h-9 max-w-md">
				<InputGroupAddon align="inline-start">
					<HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
				</InputGroupAddon>
				<InputGroupInput
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Filter by title or artist"
				/>
			</InputGroup>

			{error && (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			)}

			<ScrollArea className="h-[min(24rem,50vh)] rounded-xl border border-border/80 bg-muted/15">
				<FieldGroup className="gap-0 p-2">
					{Object.entries(grouped).map(([key, items]) => (
						<div key={key} className="flex flex-col">
							<p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
								{animeNames[items[0]?.anime_mal_id ?? 0] ?? "Anime"} ·{" "}
								{formatSongType(items[0]?.song_type ?? "")}
							</p>
							<ItemGroup className="gap-0.5">
								{items.map((t) => (
									<Item
										key={t.id}
										variant="muted"
										size="sm"
										className="rounded-lg"
									>
										<ItemMedia variant="icon">
											<Checkbox
												id={t.id}
												checked={selected.has(t.id)}
												onCheckedChange={(c) => toggle(t.id, c === true)}
												disabled={
													!selected.has(t.id) &&
													selected.size >= project.songs_count
												}
											/>
										</ItemMedia>
										<ItemContent>
											<ItemTitle>
												<label htmlFor={t.id} className="cursor-pointer font-medium">
													{t.song_title}
												</label>
											</ItemTitle>
											{t.artist && (
												<ItemDescription>{t.artist}</ItemDescription>
											)}
										</ItemContent>
									</Item>
								))}
							</ItemGroup>
						</div>
					))}
				</FieldGroup>
			</ScrollArea>

			<div className="flex justify-end border-t border-border/60 pt-4">
				<Button
					size="lg"
					onClick={handleSubmit}
					disabled={selected.size === 0 || submitting}
				>
					{submitting && <LoadingSpinner data-icon="inline-start" />}
					Continue ({selected.size})
				</Button>
			</div>

			<AlertDialog open={confirmFewerOpen} onOpenChange={setConfirmFewerOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Fewer than {project.songs_count} songs?</AlertDialogTitle>
						<AlertDialogDescription>
							You picked {selected.size}. The compilation will be shorter than planned.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Back</AlertDialogCancel>
						<AlertDialogAction onClick={() => void submit(true)}>
							Continue anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
