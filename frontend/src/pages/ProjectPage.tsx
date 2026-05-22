import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RotateCcw, Square } from "lucide-react";
import { useParams } from "react-router-dom";
import { api, connectWebSocket } from "../api";
import { usePolling } from "../hooks/usePolling";
import { useToast } from "../hooks/useToast";
import { errorToMessage } from "../lib/errors";
import CandidateSelection from "../components/CandidateSelection";
import ProgressPanel from "../components/ProgressPanel";
import RenderOrder from "../components/RenderOrder";
import SongSelection from "../components/SongSelection";
import CompletedOutput from "../components/CompletedOutput";
import PipelineTimeline from "../components/PipelineTimeline";
import ProjectHeader from "../components/ProjectHeader";
import PulseBlock from "../components/PulseBlock";
import { RUNNING_STATUSES } from "../pipeline";
import type { ProgressEvent, Project } from "../types";

const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

function StageWrapper({
	children,
	stageKey,
}: {
	children: React.ReactNode;
	stageKey: string;
}) {
	const reduced = useReducedMotion();
	const transition = reduced
		? { duration: 0 }
		: { duration: 0.3, ease: EASE_EXPO };
	return (
		<motion.div
			key={stageKey}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -6 }}
			transition={transition}
		>
			{children}
		</motion.div>
	);
}

export default function ProjectPage() {
	const { id } = useParams<{ id: string }>();
	const { addToast } = useToast();
	const [project, setProject] = useState<Project | null>(null);
	const [progress, setProgress] = useState<ProgressEvent | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [starting, setStarting] = useState(false);
	const [retrying, setRetrying] = useState(false);

	const refresh = useCallback(() => {
		if (!id) return;
		api
			.getProject(id)
			.then(setProject)
			.catch((e) => setError(errorToMessage(e)));
	}, [id]);

	useEffect(refresh, [refresh]);

	useEffect(() => {
		setProgress((prev) =>
			prev && prev.stage !== project?.status ? null : prev,
		);
	}, [project?.status]);

	useEffect(() => {
		const ws = connectWebSocket((data) => {
			const ev = data as ProgressEvent;
			if (ev.projectId === id) {
				setProgress(ev);
				refresh();
			}
		});
		return () => {
			ws.close();
		};
	}, [id, refresh]);

	usePolling(
		refresh,
		RUNNING_STATUSES.has(project?.status ?? "DRAFT") ? 3000 : 15000,
		[id, project?.status],
	);

	const running = useMemo(
		() => RUNNING_STATUSES.has(project?.status ?? "DRAFT"),
		[project?.status],
	);
	const isTerminal = useMemo(
		() =>
			project
				? ["COMPLETED", "FAILED", "CANCELLED"].includes(project.status)
				: false,
		[project?.status],
	);
	const animeNames = useMemo(
		() => project?.animes.map((a) => a.anime_name).join(", ") ?? "",
		[project?.animes],
	);
	const songTypesLabel = useMemo(
		() => project?.song_types.join(", ") ?? "",
		[project?.song_types],
	);

	if (!id) return null;
	if (!project)
		return (
			<div className="space-y-6">
				<PulseBlock className="h-8 w-64" />
				<PulseBlock className="h-10 w-full rounded-xl" />
			</div>
		);

	return (
		<div>
			<ProjectHeader project={project} />
			<div className="mb-6">
				<PipelineTimeline status={project.status} />
			</div>

			{error && (
				<p
					className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
					aria-live="polite"
				>
					{error}
				</p>
			)}

			{!isTerminal && (
				<div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 type-label text-muted">
					<span>{animeNames}</span>
					<span className="hidden sm:inline text-white/10">·</span>
					<span className="capitalize">{songTypesLabel}</span>
					<span className="hidden sm:inline text-white/10">·</span>
					<span>{project.encoder}</span>
				</div>
			)}

			<section className="min-w-0">
				<AnimatePresence mode="wait">
					{running && (
						<StageWrapper stageKey={`${project.status}-progress`}>
							<ProgressPanel
								projectId={id}
								projectStatus={project.status}
								progress={progress}
								onCancel={() =>
									api
										.cancel(id)
										.then(() => {
											refresh();
											addToast("Project cancelled", "info");
										})
										.catch((e) => {
											const msg = errorToMessage(e);
											setError(msg);
											addToast(msg, "error");
										})
								}
							/>
						</StageWrapper>
					)}

					{project.status === "SONG_SELECTION" && (
						<StageWrapper stageKey="song-selection">
							<SongSelection project={project} onDone={refresh} />
						</StageWrapper>
					)}
					{project.status === "AWAITING_CANDIDATES" && (
						<StageWrapper stageKey="candidate-selection">
							<CandidateSelection projectId={id} onDone={refresh} />
						</StageWrapper>
					)}
					{project.status === "AWAITING_RENDER_ORDER" && (
						<StageWrapper stageKey="render-order">
							<RenderOrder projectId={id} onDone={refresh} />
						</StageWrapper>
					)}
					{project.status === "COMPLETED" && (
						<StageWrapper stageKey="completed">
							<CompletedOutput projectId={id} project={project} />
						</StageWrapper>
					)}

					{project.status === "DRAFT" && (
						<StageWrapper stageKey="draft">
							<div className="py-1">
								<button
									className="rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio disabled:opacity-45 hover:opacity-90"
									disabled={starting}
									onClick={() => {
										setStarting(true);
										api
											.loadThemes(id)
											.then(() => {
												refresh();
												addToast("Themes loading", "success");
											})
											.catch((e) => {
												const msg = errorToMessage(e);
												setError(msg);
												addToast(msg, "error");
											})
											.finally(() => setStarting(false));
									}}
								>
									{starting ? "Loading..." : "Load themes"}
								</button>
							</div>
						</StageWrapper>
					)}

					{project.status === "FAILED" && (
						<StageWrapper stageKey="failed">
							<div className="py-1">
								<h2 className="type-title text-danger">Stage failed</h2>
								{project.error_message && (
									<pre className="mt-4 overflow-x-auto rounded-xl border border-danger/20 bg-studio/50 px-3 py-2 text-xs leading-5 text-danger/70">
										{project.error_message}
									</pre>
								)}
								<button
									className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio disabled:opacity-45 hover:opacity-90"
									disabled={retrying}
									onClick={() => {
										setRetrying(true);
										api
											.retry(id)
											.then(() => {
												refresh();
												addToast("Retrying failed stage", "success");
											})
											.catch((e) => {
												const msg = errorToMessage(e);
												setError(msg);
												addToast(msg, "error");
											})
											.finally(() => setRetrying(false));
									}}
								>
									<RotateCcw size={16} aria-hidden="true" />
									{retrying ? "Retrying..." : "Retry failed stage"}
								</button>
							</div>
						</StageWrapper>
					)}

					{project.status === "CANCELLED" && (
						<StageWrapper stageKey="cancelled">
							<div className="py-1">
								<h2 className="type-title flex items-center gap-2">
									<Square size={16} aria-hidden="true" />
									Stopped
								</h2>
							</div>
						</StageWrapper>
					)}
				</AnimatePresence>
			</section>
		</div>
	);
}
