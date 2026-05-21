import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FolderOpen } from "lucide-react";
import { api } from "../api";
import type { Project } from "../types";

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

  useEffect(() => {
    api.getOutput(projectId).then(setOut);
  }, [projectId]);

  const filename =
    out?.output_filename ??
    (out?.output_path ? out.output_path.split("/").pop() : null) ??
    (project.output_path ? project.output_path.split("/").pop() : null);

  return (
    <div className="rounded-2xl border border-white/10 bg-panel/70 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-lime/10 text-lime">
          <CheckCircle2 size={18} aria-hidden="true" />
        </span>
        <h2 className="text-lg font-medium text-soft">Output ready</h2>
      </div>
      {out?.exists ? (
        <>
          <p className="mt-2 text-sm text-muted">{filename ?? "final output"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={`/api/projects/${projectId}/output/download`}
              className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio"
              download
            >
              <Download size={16} aria-hidden="true" />
              Download
            </a>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/[0.06]"
              onClick={() => api.openOutputFolder(projectId)}
            >
              <FolderOpen size={16} aria-hidden="true" />
              Open folder
            </button>
          </div>
          <video
            className="mt-5 max-h-[520px] w-full rounded-2xl border border-white/10 bg-studio"
            controls
            src={`/api/projects/${projectId}/output/download`}
          />
          {project.output_path && (
            <span className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
              <ExternalLink size={12} aria-hidden="true" />
              {project.output_path}
            </span>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">The output file could not be found on disk.</p>
          <p className="mt-2 text-sm text-muted">Open the project logs to diagnose, then retry rendering from the project page.</p>
        </>
      )}
    </div>
  );
}
