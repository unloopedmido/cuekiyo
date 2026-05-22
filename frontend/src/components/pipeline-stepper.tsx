import { useState } from "react";
import {
	PIPELINE_STAGES,
	getProjectStage,
	getStageIndex,
	getStatusCopy,
} from "@/pipeline";
import type { ProjectStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TERMINAL_STATUSES = new Set<ProjectStatus>([
	"COMPLETED",
	"FAILED",
	"CANCELLED",
]);

export function PipelineStepper({ status }: { status: ProjectStatus }) {
	const [expanded, setExpanded] = useState(false);
	const currentIndex = getStageIndex(status);
	const isTerminal = TERMINAL_STATUSES.has(status);

	if (isTerminal && !expanded) {
		const stage = getProjectStage(status);
		const copy = getStatusCopy(status);
		return (
			<div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{stage.label}
					</span>
					<span className="font-heading text-sm font-semibold">{copy.label}</span>
					<p className="text-xs leading-relaxed text-muted-foreground">
						{copy.description}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 w-fit px-2 text-xs text-muted-foreground"
					onClick={() => setExpanded(true)}
				>
					Show full progress
				</Button>
			</div>
		);
	}

	return (
		<nav aria-label="Compilation progress" className="flex flex-col gap-2">
			{isTerminal && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 w-fit px-2 text-xs text-muted-foreground"
					onClick={() => setExpanded(false)}
				>
					Hide full progress
				</Button>
			)}
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
								{index + 1}
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
