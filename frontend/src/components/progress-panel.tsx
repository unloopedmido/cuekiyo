import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/api";
import { getStatusCopy } from "@/pipeline";
import type { Job, ProgressEvent, ProjectStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function isFreshProgress(
	progress: ProgressEvent | null,
	projectStatus: ProjectStatus,
	latestJob: Job | null,
): progress is ProgressEvent {
	if (!progress) return false;
	if (progress.stage !== projectStatus) return false;
	if (latestJob && progress.jobId !== latestJob.id) return false;
	return true;
}

function logLevelClass(level: string): string | undefined {
	if (level === "error") return "text-destructive";
	if (level === "warning") return "text-amber-600 dark:text-amber-400";
	return "text-muted-foreground";
}

export function ProgressPanel({
	projectId,
	projectStatus,
	progress,
	onCancel,
}: {
	projectId: string;
	projectStatus: ProjectStatus;
	progress: ProgressEvent | null;
	onCancel: () => void;
}) {
	const [logs, setLogs] = useState<{ message: string; level: string }[]>([]);
	const [logsOpen, setLogsOpen] = useState(false);
	const [latestJob, setLatestJob] = useState<Job | null>(null);
	const logEndRef = useRef<HTMLLIElement>(null);

	useEffect(() => {
		const sync = () => {
			api.listJobs(projectId).then((jobs) => {
				const running = jobs.find((j) => j.status === "running");
				setLatestJob(running ?? jobs[0] ?? null);
			});
		};
		sync();
		const t = setInterval(sync, 3000);
		return () => clearInterval(t);
	}, [projectId, projectStatus, progress?.jobId]);

	useEffect(() => {
		if (!logsOpen) return;
		const load = () => {
			api
				.projectLogs(projectId)
				.then(setLogs)
				.catch(() => setLogs([]));
		};
		load();
		const t = setInterval(load, 2000);
		return () => clearInterval(t);
	}, [logsOpen, projectId, progress?.jobId]);

	useEffect(() => {
		if (!logsOpen || logs.length === 0) return;
		logEndRef.current?.scrollIntoView({ block: "end" });
	}, [logs, logsOpen]);

	const live = isFreshProgress(progress, projectStatus, latestJob);
	const pct = Math.round(live ? progress.progress : (latestJob?.progress ?? 0));
	const message = live ? progress.message : (latestJob?.current_step ?? "");
	const stage = getStatusCopy(projectStatus);

	return (
		<section
			className="flex w-full min-w-0 flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 md:p-6"
			aria-live="polite"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="text-[11px] font-medium uppercase tracking-wider text-primary">
						In progress
					</span>
					<h2 className="font-heading text-lg font-semibold">{stage.label}</h2>
					<p className="text-sm text-muted-foreground break-words">
						{message || `${stage.label}...`}
					</p>
				</div>
				<span className="shrink-0 font-heading text-2xl font-semibold tabular-nums text-primary">
					{pct}%
				</span>
			</div>
			<Progress value={pct} className="h-2" aria-label={stage.label} />

			<Collapsible
				open={logsOpen}
				onOpenChange={setLogsOpen}
				className="flex w-full min-w-0 flex-col gap-3"
			>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" size="sm" onClick={onCancel}>
						<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon="inline-start" />
						Stop
					</Button>
					<CollapsibleTrigger asChild>
						<Button variant="outline" size="sm">
							<HugeiconsIcon icon={File01Icon} strokeWidth={2} data-icon="inline-start" />
							{logsOpen ? "Hide log" : "View log"}
						</Button>
					</CollapsibleTrigger>
				</div>

				<CollapsibleContent className="w-full min-w-0 outline-none">
					<ScrollArea
						className="h-[min(11rem,28vh)] w-full min-w-0 rounded-lg border border-border/80 bg-background/90"
						aria-label="Project log"
					>
						<div className="p-3 font-mono text-[11px] leading-relaxed">
							{logs.length === 0 ? (
								<p className="text-muted-foreground">Waiting for log output...</p>
							) : (
								<ul className="flex flex-col gap-0.5">
									{logs.map((l, i) => (
										<li
											key={i}
											className={cn(
												"break-words whitespace-pre-wrap",
												logLevelClass(l.level),
											)}
										>
											<span className="text-muted-foreground/80">[{l.level}]</span>{" "}
											{l.message}
										</li>
									))}
									<li aria-hidden className="h-px" ref={logEndRef} />
								</ul>
							)}
						</div>
					</ScrollArea>
				</CollapsibleContent>
			</Collapsible>
		</section>
	);
}
