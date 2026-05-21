import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "../api";
import { motionProps, useMotionConfig } from "../lib/motion";
import type { Job, ProgressEvent } from "../types";
import { Loader2, Terminal, CheckCircle2, XCircle } from "lucide-react";

const PIPELINE_STAGES = [
  { key: "LOADING_THEMES", label: "Themes" },
  { key: "SOURCING", label: "Search" },
  { key: "DOWNLOADING", label: "Download" },
  { key: "PROBING_NORMALIZING", label: "Normalize" },
  { key: "CUTTING", label: "Cut" },
  { key: "OVERLAYING", label: "Overlay" },
  { key: "RENDERING", label: "Render" },
];

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
  const { reduce, duration, stagger } = useMotionConfig();
  const [logs, setLogs] = useState<{ message: string; level: string; created_at: string }[]>([]);
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
      api.projectLogs(projectId)
        .then((l) => setLogs(l.slice(-100)))
        .catch(() => setLogs([]));
    };
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [showLogs, projectId, progress?.jobId]);

  const pct = Math.round(progress?.progress ?? latestJob?.progress ?? 0);
  const message = progress?.message ?? latestJob?.current_step ?? "Processing...";
  const activeStage = progress?.stage ?? projectStatus;
  const activeStageIndex = PIPELINE_STAGES.findIndex((s) => s.key === activeStage);
  const stageLabel = PIPELINE_STAGES.find((s) => s.key === activeStage)?.label ?? activeStage.replace(/_/g, " ");

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      {...motionProps(reduce, duration)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Pipeline running</h3>
          <p className="text-sm text-zinc-500 mt-0.5">Keep this window open while jobs finish.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 text-brand-amber motion-safe:animate-spin" aria-hidden />
          {stageLabel}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-zinc-200">{stageLabel}</span>
          <span className="font-mono text-sm text-brand-amber">{pct}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-brand-base border border-brand-border">
          <motion.div
            className="h-full rounded-full bg-brand-amber"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <p className="font-mono text-xs text-zinc-500 truncate">
          <span className="text-brand-amber mr-1">&gt;</span>
          {message}
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-base/15 p-4">
        <h4 className="text-xs font-medium text-zinc-500 mb-3 flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-brand-amber" aria-hidden />
          Stages
        </h4>

        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((s, idx) => {
            const isCompleted = idx < activeStageIndex && activeStageIndex !== -1;
            const isActive = s.key === activeStage;

            return (
              <motion.span
                key={s.key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  isActive
                    ? "border-brand-amber bg-brand-amber-dim text-brand-amber"
                    : isCompleted
                    ? "border-brand-success/30 bg-brand-success/5 text-brand-success"
                    : "border-brand-border bg-brand-raised/20 text-zinc-600"
                }`}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.25, delay: idx * stagger, ease: [0.16, 1, 0.3, 1] }
                }
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                ) : isActive ? (
                  <Loader2 className="h-3 w-3 shrink-0 motion-safe:animate-spin" aria-hidden />
                ) : null}
                {s.label}
              </motion.span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between border-t border-brand-border pt-4">
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-brand-raised hover:bg-brand-raised/85 border border-brand-border px-3 py-2 rounded transition-all cursor-pointer"
        >
          <Terminal className="h-3.5 w-3.5 text-brand-amber" aria-hidden />
          {showLogs ? "Hide logs" : "Show logs"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-brand-error hover:bg-brand-error/10 bg-brand-raised border border-brand-border px-3 py-2 rounded transition-all cursor-pointer"
        >
          <XCircle className="h-3.5 w-3.5" aria-hidden />
          Cancel job
        </button>
      </div>

      {showLogs && (
        <div className="border border-brand-border bg-brand-base rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed">
          {logs.map((l, idx) => {
            const isErr = l.level === "error" || l.level === "ERROR";
            const isWarn = l.level === "warning" || l.level === "WARNING" || l.level === "WARN";
            const color = isErr ? "text-brand-error" : isWarn ? "text-brand-amber" : "text-zinc-500";
            return (
              <div key={idx} className="flex gap-2 items-start py-0.5 min-w-0">
                <span className="text-zinc-600 shrink-0">
                  [{l.created_at ? new Date(l.created_at).toLocaleTimeString() : "??"}]
                </span>
                <span className={`font-bold shrink-0 uppercase ${color}`}>[{l.level}]</span>
                <span className={`min-w-0 break-words ${isErr ? "text-brand-error" : isWarn ? "text-brand-amber-hover" : "text-zinc-400"}`}>
                  {l.message}
                </span>
              </div>
            );
          })}
          {logs.length === 0 && <div className="text-zinc-600 italic text-center py-2">Waiting for log output...</div>}
        </div>
      )}
    </motion.div>
  );
}
