import { useEffect, useState } from "react";
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
    <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-4">
      <h3 className="mb-2 font-medium text-green-300">Completed</h3>
      {out?.exists ? (
        <>
          <p className="mb-4 text-sm text-zinc-400">{filename ?? "final output"}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/projects/${projectId}/output/download`}
              className="rounded bg-green-700 px-4 py-2 text-sm"
              download
            >
              Download
            </a>
            <button
              className="rounded border border-zinc-600 px-4 py-2 text-sm"
              onClick={() => api.openOutputFolder(projectId)}
            >
              Open folder
            </button>
          </div>
          <video
            className="mt-4 max-h-96 w-full rounded"
            controls
            src={`/api/projects/${projectId}/output/download`}
          />
        </>
      ) : (
        <p className="text-amber-400">Output file missing — check logs and retry.</p>
      )}
    </div>
  );
}
