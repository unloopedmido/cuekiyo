import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../api";
import { useToast } from "../hooks/useToast";
import type { Project, ThemeSong } from "../types";
import { errorToMessage } from "../lib/errors";
import PulseBlock from "./PulseBlock";

export default function SongSelection({
	project,
	onDone,
}: {
	project: Project;
	onDone: () => void;
}) {
	const { addToast } = useToast();
	const [themes, setThemes] = useState<ThemeSong[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [confirmFewer, setConfirmFewer] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const labelRefs = useRef<Record<string, HTMLLabelElement | null>>({});
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setLoading(true);
		api
			.listThemes(project.id)
			.then(setThemes)
			.catch((e) => {
				const msg = errorToMessage(e);
				setError(msg);
				addToast(msg, "error");
			})
			.finally(() => setLoading(false));
	}, [project.id]);

	const toggle = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else if (next.size < project.songs_count) next.add(id);
		setSelected(next);
	};

	const submit = async () => {
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
			addToast(
				`Saved ${picks.length} song selection${picks.length === 1 ? "" : "s"}`,
				"success",
			);
			onDone();
		} finally {
			setSubmitting(false);
		}
	};

	const queryLower = query.trim().toLowerCase();
	const filteredThemes = queryLower
		? themes.filter(
				(t) =>
					t.song_title.toLowerCase().includes(queryLower) ||
					(t.artist ?? "").toLowerCase().includes(queryLower),
			)
		: themes;

	const grouped = filteredThemes.reduce<Record<string, ThemeSong[]>>(
		(acc, t) => {
			const key = `${t.anime_mal_id}-${t.song_type}`;
			(acc[key] ??= []).push(t);
			return acc;
		},
		{},
	);

	const canSubmit =
		selected.size === project.songs_count ||
		(confirmFewer && selected.size > 0 && selected.size < project.songs_count);

	/* Row keyboard navigation and Enter/Space toggle */
	const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const list = listRef.current;
		if (!list) return;
		const labels = Array.from(
			list.querySelectorAll<HTMLLabelElement>("label[data-theme-id]"),
		);
		if (labels.length === 0) return;
		const active = document.activeElement as HTMLLabelElement | null;
		const activeIdx = active ? labels.indexOf(active) : -1;

		if (event.key === "ArrowDown") {
			event.preventDefault();
			const idx =
				activeIdx >= 0 ? Math.min(activeIdx + 1, labels.length - 1) : 0;
			labels[idx]?.focus();
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			const idx = activeIdx >= 0 ? Math.max(activeIdx - 1, 0) : 0;
			labels[idx]?.focus();
		} else if (event.key === "Enter" || event.key === " ") {
			if (activeIdx >= 0) {
				event.preventDefault();
				const themeId = labels[activeIdx].getAttribute("data-theme-id");
				if (themeId) toggle(themeId);
			}
		}
	};

	return (
		<div className="py-1">
			<div className="mb-6 flex items-baseline justify-between gap-4">
				<h2 className="type-title">Review songs</h2>
				<p className="type-label text-muted">
					{selected.size}/{project.songs_count}
				</p>
			</div>

			{loading && (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<PulseBlock key={i} className="h-12 rounded-xl" />
					))}
				</div>
			)}
			{error && (
				<p
					className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
					aria-live="polite"
				>
					{error}
				</p>
			)}
			{!loading && themes.length > 0 && (
				<div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-panel px-3 py-2">
					<Search size={14} className="text-muted" aria-hidden="true" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Find a song or artist"
						aria-label="Search themes"
						className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
					/>
					{query && (
						<button
							aria-label="Clear search"
							onClick={() => setQuery("")}
							className="grid size-11 place-items-center text-muted hover:text-soft transition-colors"
						>
							<X size={14} aria-hidden="true" />
						</button>
					)}
				</div>
			)}
			{!loading && themes.length === 0 && (
				<p className="type-body text-muted">No themes found.</p>
			)}

			<div
				ref={listRef}
				onKeyDown={handleListKeyDown}
				className="divide-y divide-white/[0.06]"
			>
				{Object.entries(grouped).map(([key, items]) => (
					<section key={key} className="py-6">
						<h3 className="mb-3 type-label capitalize">
							{items[0].song_type}s
						</h3>
						<ul className="grid gap-2">
							{items.map((theme) => (
								<li key={theme.id}>
									<label
										ref={(el) => {
											labelRefs.current[theme.id] = el;
										}}
										data-theme-id={theme.id}
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												toggle(theme.id);
											}
										}}
										className={[
											"flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
											selected.has(theme.id)
												? "border-lime/50 bg-lime/10"
												: "border-white/[0.08] bg-white/[0.03] hover:border-white/20",
										].join(" ")}
									>
										<input
											type="checkbox"
											className="mt-1"
											checked={selected.has(theme.id)}
											onChange={() => toggle(theme.id)}
										/>
										<span>
											<span className="type-body font-medium">
												{theme.song_type === "opening" ? "OP" : "ED"}
												{theme.song_number}: {theme.song_title}
											</span>
											{theme.artist && (
												<span className="type-label mt-1 block text-muted">
													{theme.artist}
												</span>
											)}
										</span>
									</label>
								</li>
							))}
						</ul>
					</section>
				))}
			</div>

			<div className="mt-8 flex flex-col gap-3 border-t border-white/[0.08] pt-5 md:flex-row md:items-center md:justify-between">
				{selected.size < project.songs_count ? (
					<label className="flex items-center gap-2 text-sm text-muted transition-colors duration-150">
						<input
							type="checkbox"
							checked={confirmFewer}
							onChange={(e) => setConfirmFewer(e.target.checked)}
						/>
						Continue with fewer than {project.songs_count}
					</label>
				) : (
					<p className="type-label text-muted">Selection target reached.</p>
				)}
				<button
					disabled={!canSubmit || submitting}
					onClick={submit}
					className="rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio disabled:opacity-45 transition-opacity duration-150 hover:opacity-90 active:opacity-80"
				>
					{submitting ? "Saving..." : "Continue to sourcing"}
				</button>
			</div>
		</div>
	);
}
