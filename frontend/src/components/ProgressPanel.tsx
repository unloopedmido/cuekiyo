import { useEffect, useState } from "react";
import { FileText, Square } from "lucide-react";
import { api } from "../api";
import { getStatusCopy } from "../pipeline";
import type { Job, ProgressEvent, ProjectStatus } from "../types";

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

export default function ProgressPanel({
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
  }, [projectId, projectStatus, progress?.jobId]);

  useEffect(() => {
    if (!showLogs) return;
    const load = () => {
      api.projectLogs(projectId).then(setLogs).catch(() => setLogs([]));
    };
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [showLogs, projectId, progress?.jobId]);

  const live = isFreshProgress(progress, projectStatus, latestJob);
  const pct = Math.round(live ? progress.progress : (latestJob?.progress ?? 0));
  const message = live ? progress.message : (latestJob?.current_step ?? "");
  const stage = getStatusCopy(projectStatus);

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-panel/70 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-soft">{stage.label}</h2>
          <p className="mt-0.5 text-xs text-muted">{message || "Working..."}</p>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums text-lime">{pct}%</p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full bg-lime transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.06]"
        >
          <Square size={14} aria-hidden="true" />
          Cancel
        </button>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.06]"
        >
          <FileText size={14} aria-hidden="true" />
          {showLogs ? "Hide" : "View"} logs
        </button>
      </div>
      {showLogs && (
        <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/10 bg-studio/70 p-3 text-xs leading-5 text-muted">
          {logs.length === 0 ? (
            <div>No log entries yet...</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={l.level === "error" ? "text-red-200" : l.level === "warning" ? "text-amber-200" : ""}>
                [{l.level}] {l.message}
              </div>
            ))
          )}
        </pre>
      )}
    </div>
  );
}
