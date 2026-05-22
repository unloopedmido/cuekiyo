import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FolderOpen } from "lucide-react";
import { api } from "../api";
import type { Project } from "../types";
import PulseBlock from "./PulseBlock";

export default function CompletedOutput({
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
		return (
			<div className="space-y-4 py-1">
				<div className="flex items-center gap-3">
					<PulseBlock className="size-10 rounded-xl" />
					<PulseBlock className="h-5 w-32" />
				</div>
				<PulseBlock className="h-4 w-48" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="py-1">
				<h2 className="type-title text-danger">Could not check output</h2>
				<p className="type-body mt-2 text-danger/80">
					The backend did not respond. Check that it is running, then refresh.
				</p>
			</div>
		);
	}

	return (
		<div className="py-1">
			<div className="flex items-center gap-3">
				<span className="grid size-10 place-items-center rounded-xl bg-lime/10 text-lime">
					<CheckCircle2 size={18} aria-hidden="true" />
				</span>
				<h2 className="type-title text-soft">Output ready</h2>
			</div>
			{out?.exists ? (
				<>
					<p className="type-body mt-2 text-muted">
						{filename ?? "final output"}
					</p>
					<div className="mt-5 flex flex-wrap gap-2">
						<a
							href={`/api/projects/${projectId}/output/download`}
							className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio transition-opacity duration-150 hover:opacity-90 active:opacity-80"
							download
						>
							<Download size={16} aria-hidden="true" />
							Download
						</a>
						<button
							className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm transition-colors duration-150 hover:bg-white/[0.06]"
							onClick={() => api.openOutputFolder(projectId)}
						>
							<FolderOpen size={16} aria-hidden="true" />
							Open folder
						</button>
					</div>
					<video
						className="mt-5 max-h-[520px] w-full rounded-2xl border border-white/10 bg-studio"
						controls
						aria-label="Final output preview"
						src={`/api/projects/${projectId}/output/download`}
					/>
					{project.output_path && (
						<span className="mt-3 inline-flex items-center gap-2 type-label text-muted">
							<ExternalLink size={12} aria-hidden="true" />
							{project.output_path}
						</span>
					)}
				</>
			) : (
				<>
					<p className="type-body mt-2 text-muted">
						The output file could not be found on disk.
					</p>
					<p className="type-body mt-2 text-muted">
						Open the project logs to diagnose, then retry rendering from the
						project page.
					</p>
				</>
			)}
		</div>
	);
}
