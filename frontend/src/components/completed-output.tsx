import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Download01Icon,
	FolderOpenIcon,
} from "@hugeicons/core-free-icons";
import { api } from "@/api";
import { errorToMessage } from "@/lib/errors";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function CompletedOutput({
	projectId,
	project,
}: {
	projectId: string;
	project: Project;
}) {
	const [out, setOut] = useState<{
		output_path: string | null;
		output_filename: string | null;
		exists: boolean;
	} | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		api
			.getOutput(projectId)
			.then(setOut)
			.catch(() => setError(true));
	}, [projectId]);

	const filename =
		out?.output_filename ??
		(out?.output_path ? out.output_path.split("/").pop() : null) ??
		(project.output_path ? project.output_path.split("/").pop() : null);

	if (!out && !error) {
		return <Skeleton className="aspect-video w-full max-w-3xl rounded-xl" />;
	}

	if (error) {
		return (
			<p className="text-sm text-destructive">
				Could not reach the output endpoint. Is the backend running?
			</p>
		);
	}

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h2 className="font-heading text-xl font-semibold">Your video is ready</h2>
				<p className="text-sm text-muted-foreground">{filename ?? "Final MP4"}</p>
			</div>

			{out?.exists ? (
				<>
					<div className="overflow-hidden rounded-xl border border-border/80 bg-black/40">
						<video
							className="aspect-video w-full max-h-[min(32rem,70vh)]"
							controls
							aria-label="Final output preview"
							src={`/api/projects/${projectId}/output/download`}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button asChild size="lg">
							<a
								href={`/api/projects/${projectId}/output/download`}
								download
								target="_blank"
								rel="noreferrer"
							>
								<HugeiconsIcon icon={Download01Icon} strokeWidth={2} data-icon="inline-start" />
								Open output
							</a>
						</Button>
						<Button
							variant="outline"
							size="lg"
							onClick={() =>
								api
									.openOutputFolder(projectId)
									.catch((e) => toast.error(errorToMessage(e)))
							}
						>
							<HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} data-icon="inline-start" />
							Reveal in folder
						</Button>
					</div>
					{project.output_path && (
						<p className="font-mono text-xs text-muted-foreground">
							{project.output_path}
						</p>
					)}
				</>
			) : (
				<p className="text-sm text-muted-foreground">
					Output file missing on disk. Check logs and retry from a failed state if
					needed.
				</p>
			)}
		</section>
	);
}
