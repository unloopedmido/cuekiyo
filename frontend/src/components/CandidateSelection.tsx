import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, ExternalLink, Search, X } from "lucide-react";
import { api } from "../api";
import { useToast } from "../hooks/useToast";
import type { Candidate, Song } from "../types";
import { errorToMessage } from "../lib/errors";
import { candidateThumbnail } from "../lib/youtube";
import PulseBlock from "./PulseBlock";

const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const candidateContainer = {
	hidden: {},
	show: { transition: { staggerChildren: 0.05 } },
};

const candidateItem = {
	hidden: { opacity: 0, y: 8 },
	show: { opacity: 1, y: 0 },
};

export default function CandidateSelection({
	projectId,
	onDone,
}: {
	projectId: string;
	onDone: () => void;
}) {
	const { addToast } = useToast();
	const [songs, setSongs] = useState<Song[]>([]);
	const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
	const [activeSongId, setActiveSongId] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [selecting, setSelecting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const songBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const gridRef = useRef<HTMLDivElement>(null);
	const completionRef = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();
	const itemTransition = reduced
		? { duration: 0 }
		: { duration: 0.25, ease: EASE_EXPO };

	const refreshSongs = async () => {
		setLoading(true);
		setError(null);
		const s = await api.listSongs(projectId);
		const map: Record<string, Candidate[]> = {};
		await Promise.all(
			s.map(async (song) => {
				map[song.id] = await api.listCandidates(projectId, song.id);
			}),
		);
		setSongs(s);
		setCandidates(map);
		setActiveSongId(
			(current) =>
				current ??
				s.find((song) => !song.selected_candidate_id)?.id ??
				s[0]?.id ??
				null,
		);
		setLoading(false);
	};

	useEffect(() => {
		refreshSongs().catch((e) => {
			const msg = errorToMessage(e);
			setError(msg);
			addToast(msg, "error");
			setLoading(false);
		});
	}, [projectId]);

	const focusNextUnreviewed = (afterSongId: string) => {
		const idx = filteredSongs.findIndex((s) => s.id === afterSongId);
		const next =
			filteredSongs.slice(idx + 1).find((s) => !s.selected_candidate_id) ??
			filteredSongs.slice(0, idx).find((s) => !s.selected_candidate_id);
		if (next) {
			const btn = songBtnRefs.current[next.id];
			if (btn) {
				btn.focus();
				setActiveSongId(next.id);
			}
		} else if (completionRef.current) {
			completionRef.current.focus();
		}
	};

	const select = async (songId: string, candidateId: string) => {
		if (selecting) return;
		setSelecting(true);
		try {
			await api.selectCandidate(projectId, songId, candidateId);
			setSongs((prev) =>
				prev.map((s) =>
					s.id === songId ? { ...s, selected_candidate_id: candidateId } : s,
				),
			);
			setCandidates((prev) => ({
				...prev,
				[songId]: (prev[songId] ?? []).map((c) => ({
					...c,
					is_selected: c.id === candidateId,
				})),
			}));
			addToast("Clip selected", "success");
			onDone();
			setTimeout(() => focusNextUnreviewed(songId), 0);
		} finally {
			setSelecting(false);
		}
	};

	const allSelected =
		songs.length > 0 && songs.every((s) => s.selected_candidate_id);
	const activeSong = songs.find((song) => song.id === activeSongId) ?? songs[0];
	const selectedCount = songs.filter(
		(song) => song.selected_candidate_id,
	).length;

	const queryLower = query.trim().toLowerCase();
	const filteredSongs = queryLower
		? songs.filter(
				(s) =>
					s.song_title.toLowerCase().includes(queryLower) ||
					s.anime_name.toLowerCase().includes(queryLower),
			)
		: songs;

	/* Sidebar keyboard nav */
	const handleSidebarKeyDown = (event: React.KeyboardEvent) => {
		if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
		event.preventDefault();
		const ids = filteredSongs.map((s) => s.id);
		const currentId = activeSongId ?? ids[0] ?? null;
		if (!currentId) return;
		const idx = ids.indexOf(currentId);
		const nextIdx =
			event.key === "ArrowUp"
				? (idx - 1 + ids.length) % ids.length
				: (idx + 1) % ids.length;
		const nextId = ids[nextIdx];
		setActiveSongId(nextId);
		songBtnRefs.current[nextId]?.focus();
	};

	/* Candidate grid keyboard nav */
	const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const grid = gridRef.current;
		if (!grid) return;
		const buttons = Array.from(
			grid.querySelectorAll<HTMLButtonElement>("button[data-candidate-id]"),
		);
		if (buttons.length === 0) return;
		const active = document.activeElement as HTMLButtonElement | null;
		const activeIdx = active ? buttons.indexOf(active) : -1;

		const cols = 2; // md:grid-cols-2

		if (event.key === "ArrowRight") {
			event.preventDefault();
			const idx = activeIdx >= 0 ? (activeIdx + 1) % buttons.length : 0;
			buttons[idx]?.focus();
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			const idx =
				activeIdx >= 0
					? (activeIdx - 1 + buttons.length) % buttons.length
					: buttons.length - 1;
			buttons[idx]?.focus();
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			const idx =
				activeIdx >= 0 ? Math.min(activeIdx + cols, buttons.length - 1) : 0;
			buttons[idx]?.focus();
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			const idx = activeIdx >= 0 ? Math.max(activeIdx - cols, 0) : 0;
			buttons[idx]?.focus();
		} else if (event.key === "Enter" || event.key === " ") {
			if (activeIdx >= 0) {
				event.preventDefault();
				buttons[activeIdx]?.click();
			}
		}
	};

	return (
		<div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
			<aside className="p-1">
				<div className="px-2 py-2">
					<h2 className="type-label">Candidate review</h2>
					<p className="type-label mt-1 text-muted">
						{selectedCount} of {songs.length} selected
					</p>
				</div>
				<div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-panel px-3 py-2">
					<Search size={14} className="text-muted" aria-hidden="true" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Find song"
						className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted/60"
					/>
					{query && (
						<button
							aria-label="Clear search"
							onClick={() => setQuery("")}
							className="grid size-11 place-items-center text-muted hover:text-soft"
						>
							<X size={14} aria-hidden="true" />
						</button>
					)}
				</div>
				<div
					className="mt-2 grid gap-1 overflow-y-auto max-h-[60vh]"
					onKeyDown={handleSidebarKeyDown}
				>
					{filteredSongs.map((song) => (
						<button
							key={song.id}
							ref={(el) => {
								songBtnRefs.current[song.id] = el;
							}}
							onClick={() => setActiveSongId(song.id)}
							className={[
								"flex items-start gap-2 rounded-xl px-3 py-2 text-left",
								activeSong?.id === song.id
									? "bg-lime/10 text-soft"
									: "text-muted transition-colors duration-150 hover:bg-white/[0.06]",
							].join(" ")}
						>
							<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-white/10">
								{song.selected_candidate_id ? (
									<Check size={12} className="text-lime" aria-hidden="true" />
								) : null}
							</span>
							<span className="min-w-0">
								<span className="block truncate text-sm">
									{song.song_title}
								</span>
								<span className="block truncate type-label text-muted">
									{song.anime_name}
								</span>
							</span>
						</button>
					))}
					{filteredSongs.length === 0 && query && (
						<p className="px-3 py-2 text-xs text-muted">
							No songs match &ldquo;{query}&rdquo;.
						</p>
					)}
				</div>
			</aside>

			<section className="min-w-0">
				{loading && (
					<div className="space-y-3 py-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<PulseBlock key={i} className="h-10 rounded-xl" />
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
				{!loading && activeSong && (
					<>
						<div className="mb-4">
							<h2 className="type-title">{activeSong.song_title}</h2>
							<p className="type-label mt-1 text-muted">{activeSong.anime_name}</p>
						</div>

						{(candidates[activeSong.id] ?? []).length === 0 ? (
							<p className="type-body text-muted">No matching videos found.</p>
						) : (
							<motion.div
								ref={gridRef}
								key={activeSong.id}
								onKeyDown={handleGridKeyDown}
								className="grid gap-3 md:grid-cols-2"
								variants={candidateContainer}
								initial="hidden"
								animate="show"
							>
								{(candidates[activeSong.id] ?? []).map((candidate) => {
									const selected =
										candidate.is_selected ||
										activeSong.selected_candidate_id === candidate.id;
									const thumbnail = candidateThumbnail(candidate);
									return (
										<motion.div
											key={candidate.id}
											variants={candidateItem}
											transition={itemTransition}
											className={[
												"group overflow-hidden rounded-2xl border text-left transition",
												selected
													? "border-lime bg-lime/10"
													: "border-white/10 bg-studio/45 hover:border-white/20 hover:bg-white/[0.04]",
												selecting ? "pointer-events-none opacity-60" : "",
											].join(" ")}
										>
											<button
												data-candidate-id={candidate.id}
												disabled={selecting}
												aria-disabled={selecting}
												onClick={() => select(activeSong.id, candidate.id)}
												className="block w-full text-left"
											>
												{thumbnail ? (
													<motion.img
														src={thumbnail}
														alt=""
														className="aspect-video w-full object-cover"
														whileHover={
															reduced ? undefined : { scale: 1.03 }
														}
														transition={itemTransition}
													/>
												) : (
													<div className="grid aspect-video w-full place-items-center bg-white/[0.04] text-muted">
														No thumbnail
													</div>
												)}
												<div className="p-4 pb-0">
													<div className="flex items-start justify-between gap-3">
														<p className="line-clamp-2 type-body font-medium">
															{candidate.title}
														</p>
														{selected && (
															<Check
																size={17}
																className="shrink-0 text-lime"
																aria-hidden="true"
															/>
														)}
													</div>
													<p className="type-label mt-2 text-muted">
														{candidate.uploader_name ?? "Unknown uploader"} ·{" "}
														{candidate.view_count?.toLocaleString() ?? "?"}{" "}
														views ·{" "}
														{candidate.duration
															? `${Math.round(candidate.duration)}s`
															: "?"}
													</p>
												</div>
											</button>
											<div className="p-4 pt-0">
												<div className="mt-3 flex items-center justify-between type-label text-muted">
													<span className="flex items-center gap-2">
														Match {candidate.score.toFixed(1)}
														<span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
															<motion.span
																className="block h-full rounded-full bg-lime"
																initial={false}
																animate={{
																	width: `${Math.min(candidate.score * 100, 100)}%`,
																}}
																transition={itemTransition}
															/>
														</span>
													</span>
													<a
														href={candidate.url}
														className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-lime"
														aria-label="Open source video in new tab"
														target="_blank"
														rel="noreferrer"
													>
														Source <ExternalLink size={12} aria-hidden="true" />
													</a>
												</div>
											</div>
										</motion.div>
									);
								})}
							</motion.div>
						)}
					</>
				)}
				{allSelected && (
					<div
						ref={completionRef}
						tabIndex={-1}
						className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-white/[0.08] pt-5 outline-none"
					>
						<p className="type-body text-lime">All clips chosen.</p>
						<button
							onClick={onDone}
							className="rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio transition-opacity hover:opacity-90"
						>
							Continue to processing
						</button>
					</div>
				)}
			</section>
		</div>
	);
}
