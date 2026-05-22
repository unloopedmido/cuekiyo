import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowRight,
	Plus,
	Search,
	Trash2,
	TriangleAlert,
	X,
} from "lucide-react";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import PulseBlock from "../components/PulseBlock";
import { useToast } from "../hooks/useToast";
import type { Project } from "../types";
import { getProjectAction, getStatusCopy } from "../pipeline";
import { errorToMessage } from "../lib/errors";

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	const years = Math.floor(months / 12);
	return `${years}y ago`;
}

export default function Dashboard() {
	const { addToast } = useToast();
	const [projects, setProjects] = useState<Project[]>([]);
	const [binaries, setBinaries] = useState<
		Record<string, { available: boolean; detail: string }>
	>({});
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	const load = () => {
		setLoading(true);
		api
			.listProjects()
			.then(setProjects)
			.catch((e) => {
				const msg = errorToMessage(e);
				setError(msg);
				addToast(msg, "error");
			})
			.finally(() => setLoading(false));
		api
			.binaries()
			.then(setBinaries)
			.catch(() => {});
	};

	useEffect(load, []);

	const missing = Object.entries(binaries).filter(([, v]) => !v.available);

	useEffect(() => {
		const handle = setTimeout(() => setDebouncedQuery(query), 200);
		return () => clearTimeout(handle);
	}, [query]);

	const filteredProjects = useMemo(() => {
		const q = debouncedQuery.trim().toLowerCase();
		if (!q) return projects;
		return projects.filter((p) => {
			const copy = getStatusCopy(p.status);
			return (
				p.title.toLowerCase().includes(q) ||
				copy.label.toLowerCase().includes(q) ||
				copy.description.toLowerCase().includes(q) ||
				p.animes
					.map((a) => a.anime_name)
					.join(" ")
					.toLowerCase()
					.includes(q) ||
				getProjectAction(p.status).toLowerCase().includes(q)
			);
		});
	}, [projects, debouncedQuery]);

	return (
		<div>
			<div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="type-headline">Projects</h1>
				</div>
				<Link
					to="/projects/new"
					className="inline-flex w-fit items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio transition-opacity duration-150 hover:opacity-90 active:opacity-80"
				>
					<Plus size={16} aria-hidden="true" />
					New project
				</Link>
			</div>

			<div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-panel px-4 py-2.5">
				<Search size={16} className="text-muted" aria-hidden="true" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by title, status, or anime"
					aria-label="Search projects"
					className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
				/>
				{query && (
					<button
						aria-label="Clear search"
						onClick={() => setQuery("")}
						className="grid size-11 place-items-center text-muted hover:text-soft transition-colors duration-150"
					>
						<X size={16} aria-hidden="true" />
					</button>
				)}
			</div>

			{missing.length > 0 && (
				<div className="mb-5 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
					<TriangleAlert
						size={18}
						className="mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					<div>
						<p className="font-medium">Some local tools are missing.</p>
						<p className="mt-1 text-warning/80">
							{missing.map(([k]) => k).join(", ")} ·{" "}
							<Link to="/settings" className="underline hover:text-warning">
								Settings
							</Link>
						</p>
					</div>
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
			{loading && (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="py-5">
							<div className="mb-2 flex items-center gap-2">
								<PulseBlock className="h-6 w-20 rounded-full" />
								<PulseBlock className="h-4 w-16" />
							</div>
							<PulseBlock className="h-5 w-48" />
						</div>
					))}
				</div>
			)}
			{!loading && (
				<ul className="divide-y divide-white/10">
					{filteredProjects.map((p) => (
						<li
							key={p.id}
							className="py-5 transition-colors hover:bg-white/[0.05]"
						>
							<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
								<div className="min-w-0">
									<div className="mb-2 flex flex-wrap items-center gap-2">
										<StatusBadge status={p.status} />
										<span className="type-label text-muted">
											Updated {timeAgo(p.updated_at)}
										</span>
									</div>
									<Link
										to={`/projects/${p.id}`}
										className="type-title hover:text-lime truncate"
									>
										{p.title}
									</Link>
									<p className="type-label mt-1 text-muted">
										{getProjectAction(p.status)}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-3">
									{pendingDeleteId === p.id ? (
										<div className="flex flex-col items-end gap-1.5">
											<span className="text-xs text-muted">
												Delete this project?
											</span>
											<div className="flex items-center gap-3">
												<button
													className="text-sm text-danger hover:underline focus-visible:underline outline-none"
													onClick={() => {
														api
															.deleteProject(p.id)
															.then(() => {
																load();
																setPendingDeleteId(null);
																addToast("Project deleted", "info");
															})
															.catch(() => setPendingDeleteId(null));
													}}
												>
													Delete
												</button>
												<button
													className="text-sm text-muted hover:text-soft transition-colors duration-150"
													onClick={() => setPendingDeleteId(null)}
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										<>
											{p.status === "CANCELLED" ? (
												<span className="text-xs text-muted">Stopped</span>
											) : (
												<Link
													to={`/projects/${p.id}`}
													className="inline-flex items-center gap-1 text-sm transition-colors duration-150 hover:text-lime"
												>
													{getProjectAction(p.status)}
													<ArrowRight size={15} aria-hidden="true" />
												</Link>
											)}
											<button
												className="grid size-11 place-items-center text-muted transition-colors duration-150 hover:text-danger"
												aria-label={`Delete ${p.title}`}
												onClick={() => setPendingDeleteId(p.id)}
											>
												<Trash2 size={16} aria-hidden="true" />
											</button>
										</>
									)}
								</div>
							</div>
						</li>
					))}
					{filteredProjects.length === 0 && debouncedQuery && (
						<li className="py-12 text-center">
							<p className="type-body text-muted">
								No projects match &ldquo;{debouncedQuery}&rdquo;.
							</p>
						</li>
					)}
					{projects.length === 0 && (
						<li className="py-20 text-center">
							<h2 className="type-title">No projects yet</h2>
							<Link
								to="/projects/new"
								className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio hover:opacity-90"
							>
								<Plus size={16} aria-hidden="true" />
								Create project
							</Link>
						</li>
					)}
				</ul>
			)}
		</div>
	);
}
