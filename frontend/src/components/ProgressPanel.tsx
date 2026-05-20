import { useEffect, useState } from "react";
import { api } from "../api";
import type { Job, ProgressEvent } from "../types";

export default function ProgressPanel({
  projectId,
  projectStatus,
  progress,
  onCancel,
}: {
  projectId: string;
  projectStatus: string;
  progress: ProgressEvent | null;
  onCancel: () => void;
}) {
  const [logs, setLogs] = useState<{ message: string; level: string }[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [latestJob, setLatestJob] = useState<Job | null>(null);

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
  }, [projectId, progress?.jobId]);

  useEffect(() => {
    if (!showLogs) return;
    const load = () => {
      api.projectLogs(projectId).then(setLogs).catch(() => setLogs([]));
    };
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [showLogs, projectId, progress?.jobId]);

  const pct = Math.round(progress?.progress ?? latestJob?.progress ?? 0);
  const message = progress?.message ?? latestJob?.current_step ?? "";
  const stage = progress?.stage ?? projectStatus;

  return (
    <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-2 font-medium">Pipeline progress</h3>
      <p className="mb-2 text-sm text-zinc-400">
        {stage.replace(/_/g, " ")} — {message || "Working…"}
      </p>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mb-3 text-xs text-zinc-500">{pct}% overall</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="rounded border border-zinc-600 px-3 py-1 text-sm">
          Cancel
        </button>
        <button onClick={() => setShowLogs(!showLogs)} className="rounded border border-zinc-600 px-3 py-1 text-sm">
          {showLogs ? "Hide" : "View"} logs
        </button>
      </div>
      {showLogs && (
        <pre className="mt-4 max-h-64 overflow-auto rounded bg-black/40 p-2 text-xs">
          {logs.length === 0 ? (
            <div className="text-zinc-500">No log entries yet…</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={l.level === "error" ? "text-red-400" : l.level === "warning" ? "text-amber-400" : ""}>
                [{l.level}] {l.message}
              </div>
            ))
          )}
        </pre>
      )}
    </div>
  );
}
