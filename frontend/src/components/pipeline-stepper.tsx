import {
	PIPELINE_STAGES,
	getStageIndex,
	getStatusCopy,
} from "@/pipeline";
import type { ProjectStatus } from "@/types";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";

function CompletedTimeline() {
	return (
		<nav aria-label="Compilation progress" className="flex flex-col gap-3">
			<ol className="flex flex-col">
				{PIPELINE_STAGES.map((stage, index) => (
					<li key={stage.id} className="relative flex gap-3 pb-4 last:pb-0">
						{index < PIPELINE_STAGES.length - 1 && (
							<span
								aria-hidden
								className="absolute top-6 left-[11px] h-[calc(100%-1rem)] w-px bg-primary/40"
							/>
						)}
						<span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
							<HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-4" />
						</span>
						<div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
							<span className="text-sm font-medium leading-none text-muted-foreground">
								{stage.label}
							</span>
						</div>
					</li>
				))}
			</ol>
		</nav>
	);
}

function FailedTimeline({ status }: { status: ProjectStatus }) {
	const failedIndex = getStageIndex(status);
	const copy = getStatusCopy(status);

	return (
		<nav aria-label="Compilation progress" className="flex flex-col gap-3">
			<div className="flex flex-col gap-1 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
				<span className="text-xs font-semibold text-destructive">{copy.label}</span>
				<p className="text-[11px] leading-relaxed text-muted-foreground">{copy.description}</p>
			</div>
			<ol className="flex flex-col">
				{PIPELINE_STAGES.map((stage, index) => {
					const state =
						index < failedIndex
							? "complete"
							: index === failedIndex
								? "failed"
								: "upcoming";
					return (
						<li key={stage.id} className="relative flex gap-3 pb-4 last:pb-0">
							{index < PIPELINE_STAGES.length - 1 && (
								<span
									aria-hidden
									className={cn(
										"absolute top-6 left-[11px] h-[calc(100%-1rem)] w-px",
										state === "complete" ? "bg-primary/40" : "bg-border",
									)}
								/>
							)}
							<span
								className={cn(
									"relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
									state === "complete" && "bg-primary/15 text-primary",
									state === "failed" && "bg-destructive/15 text-destructive",
									state === "upcoming" && "border border-border bg-muted/40 text-muted-foreground",
								)}
							>
								{state === "complete" ? (
									<HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-4" />
								) : (
									index + 1
								)}
							</span>
							<div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
								<span
									className={cn(
										"text-sm font-medium leading-none",
										state === "failed" && "text-destructive",
										state === "upcoming" && "text-muted-foreground",
									)}
								>
									{stage.label}
								</span>
							</div>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

function ActiveTimeline({ status }: { status: ProjectStatus }) {
	const currentIndex = getStageIndex(status);

	return (
		<nav aria-label="Compilation progress" className="flex flex-col gap-2">
			<ol className="flex flex-col">
				{PIPELINE_STAGES.map((stage, index) => {
					const state =
						index < currentIndex
							? "complete"
							: index === currentIndex
								? "current"
								: "upcoming";
					return (
						<li key={stage.id} className="relative flex gap-3 pb-6 last:pb-0">
							{index < PIPELINE_STAGES.length - 1 && (
								<span
									aria-hidden
									className={cn(
										"absolute top-7 left-[11px] h-[calc(100%-1.25rem)] w-px",
										state === "complete" ? "bg-primary/40" : "bg-border",
									)}
								/>
							)}
							<span
								className={cn(
									"relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
									state === "current" &&
										"bg-primary text-primary-foreground ring-4 ring-primary/20",
									state === "complete" && "bg-primary/15 text-primary",
									state === "upcoming" &&
										"border border-border bg-muted/40 text-muted-foreground",
								)}
							>
								{state === "complete" ? (
									<HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-4" />
								) : (
									index + 1
								)}
							</span>
							<div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
								<span
									className={cn(
										"text-sm font-medium leading-none",
										state === "current" && "text-foreground",
										state === "upcoming" && "text-muted-foreground",
									)}
								>
									{stage.label}
								</span>
								<span className="text-xs leading-snug text-muted-foreground">
									{stage.description}
								</span>
							</div>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

export function PipelineStepper({ status }: { status: ProjectStatus }) {
	if (status === "COMPLETED") return <CompletedTimeline />;
	if (status === "FAILED") return <FailedTimeline status={status} />;
	if (status === "CANCELLED") return <FailedTimeline status={status} />;
	return <ActiveTimeline status={status} />;
}
