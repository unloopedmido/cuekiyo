import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { api, connectWebSocket } from "../api";
import { USER_GATES, RUNNING_STATUSES } from "../lib/pipeline";
import { motionProps, useMotionConfig } from "../lib/motion";
import StatusBadge from "../components/StatusBadge";
import CandidateSelection from "../components/CandidateSelection";
import ProgressPanel from "../components/ProgressPanel";
import RenderOrder from "../components/RenderOrder";
import SongSelection from "../components/SongSelection";
import CompletedOutput from "../components/CompletedOutput";
import type { ProgressEvent, Project, ProjectStatus } from "../types";
import { ChevronLeft, Terminal, AlertTriangle, Play, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface LogEntry {
  id: string;
  message: string;
  level: string;
  created_at: string;
}

const STAGES = [
  { label: "Themes", desc: "Load from MAL" },
  { label: "Songs", desc: "Pick tracks" },
  { label: "Clips", desc: "Choose uploads" },
  { label: "Order", desc: "Sort sequence" },
  { label: "Done", desc: "Export MP4" },
];

function stageIndex(status: ProjectStatus): number {
  if (status === "DRAFT" || status === "LOADING_THEMES") return 0;
  if (status === "SONG_SELECTION") return 1;
  if (status === "SOURCING" || status === "AWAITING_CANDIDATES" || status === "DOWNLOADING") return 2;
  if (
    status === "PROBING_NORMALIZING" ||
    status === "CUTTING" ||
    status === "OVERLAYING" ||
    status === "AWAITING_RENDER_ORDER" ||
    status === "RENDERING"
  ) {
    return 3;
  }
  if (status === "COMPLETED") return 4;
  return -1;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { reduce, duration } = useMotionConfig();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGate = project ? USER_GATES.has(project.status) : false;
  const isRunning = project ? RUNNING_STATUSES.has(project.status) : false;

  const refresh = useCallback(() => {
    if (!id) return;
    api.getProject(id).then(setProject).catch((e) => setError(String(e)));
  }, [id]);

  const loadLogs = useCallback(() => {
    if (!id) return;
    api.projectLogs(id)
      .then(setLogs)
      .catch((e) => console.error("Failed to load logs:", e));
  }, [id]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (!id) return;
    loadLogs();
    const ws = connectWebSocket((data) => {
      const ev = data as ProgressEvent;
      if (ev.projectId === id) {
        setProgress(ev);
        refresh();
        loadLogs();
      }
    });

    const interval = isRunning ? 3000 : 8000;
    const t = setInterval(() => {
      refresh();
      loadLogs();
    }, interval);

    return () => {
      ws.close();
      clearInterval(t);
    };
  }, [id, isRunning, refresh, loadLogs]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("project-focus-mode", { detail: { active: isGate || isRunning } }),
    );
    return () => {
      window.dispatchEvent(new CustomEvent("project-focus-mode", { detail: { active: false } }));
    };
  }, [isGate, isRunning]);

  const currentStageIndex = useMemo(
    () => (project ? stageIndex(project.status) : 0),
    [project],
  );

  if (!id) return null;
  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center bg-brand-base font-mono text-xs text-zinc-500">
        Loading project...
      </div>
    );
  }

  const gateKey = project.status;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-brand-base">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-brand-border px-6 bg-brand-base">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-raised text-zinc-400 hover:border-brand-amber hover:text-brand-amber transition-all"
            title="Back to dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-brand-border shrink-0" />
          <h2 className="truncate text-sm font-semibold text-zinc-100">{project.title}</h2>
          <StatusBadge status={project.status} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-5">
        <div
          className={`rounded-lg border border-brand-border bg-brand-raised/20 px-4 py-3 transition-opacity ${
            isGate ? "opacity-80" : ""
          }`}
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {STAGES.map((st, index) => {
              const isActive = index === currentStageIndex;
              const isCompleted = index < currentStageIndex && currentStageIndex !== -1;
              return (
                <div key={st.label} className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-mono ${
                        isActive
                          ? "border-brand-amber bg-brand-amber-dim text-brand-amber font-semibold"
                          : isCompleted
                          ? "border-brand-success/50 bg-brand-success/10 text-brand-success"
                          : "border-brand-border bg-brand-raised text-zinc-600"
                      }`}
                      animate={
                        isActive && !reduce
                          ? { boxShadow: ["0 0 0 0 rgba(235,176,77,0)", "0 0 0 4px rgba(235,176,77,0.15)", "0 0 0 0 rgba(235,176,77,0)"] }
                          : { boxShadow: "0 0 0 0 rgba(235,176,77,0)" }
                      }
                      transition={reduce ? { duration: 0 } : { duration: 1.8, repeat: Infinity }}
                    >
                      {index + 1}
                    </motion.div>
                    <div className="hidden sm:block">
                      <div
                        className={`text-xs font-medium ${isActive ? "text-brand-amber" : isCompleted ? "text-zinc-300" : "text-zinc-600"}`}
                      >
                        {st.label}
                      </div>
                    </div>
                  </div>
                  {index < STAGES.length - 1 && (
                    <div className="mx-1 h-px w-6 border-t border-dashed border-brand-border sm:w-10" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-brand-error/30 bg-brand-error/5 p-4 text-sm text-brand-error flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
        {project.error_message && (
          <div className="rounded-lg border border-brand-error/30 bg-brand-error/5 p-4 text-sm text-brand-error flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium block mb-1">Stage failed</span>
              <p className="text-zinc-400 font-mono text-xs bg-brand-base/40 p-2 rounded mt-1 border border-brand-border/40 break-words">
                {project.error_message}
              </p>
            </div>
          </div>
        )}

        <div
          className={`min-h-[280px] flex-1 rounded-xl border bg-brand-raised/40 p-6 flex flex-col ${
            isGate ? "border-brand-amber/40 shadow-lg shadow-brand-amber/5" : "border-brand-border"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={gateKey}
              className="w-full flex-1"
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -6 }}
              {...motionProps(reduce, duration)}
            >
              {project.status === "DRAFT" && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="rounded-full bg-brand-amber/5 border border-brand-amber/20 p-4 text-brand-amber">
                    <Terminal className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">Themes ready to load</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mt-1">
                      Fetch opening and ending metadata from MyAnimeList for your selected anime.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-amber px-5 py-2.5 text-xs font-semibold text-brand-base hover:bg-brand-amber-hover transition-colors cursor-pointer"
                    onClick={() => api.loadThemes(id).then(refresh)}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Load themes
                  </button>
                </div>
              )}

              {project.status === "FAILED" && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="rounded-full bg-brand-error/5 border border-brand-error/20 p-4 text-brand-error">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-brand-error">Pipeline failed</h3>
                    <p className="text-sm text-zinc-500 max-w-sm mt-1">
                      Check the logs below, then retry the failed stage.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-amber px-5 py-2.5 text-xs font-semibold text-brand-base hover:bg-brand-amber-hover transition-colors cursor-pointer"
                    onClick={() => api.retry(id).then(refresh)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry stage
                  </button>
                </div>
              )}

              {project.status === "SONG_SELECTION" && <SongSelection project={project} onDone={refresh} />}
              {project.status === "AWAITING_CANDIDATES" && <CandidateSelection projectId={id} onDone={refresh} />}
              {project.status === "AWAITING_RENDER_ORDER" && <RenderOrder projectId={id} onDone={refresh} />}
              {project.status === "COMPLETED" && <CompletedOutput projectId={id} project={project} />}

              {isRunning && (
                <ProgressPanel
                  projectId={id}
                  projectStatus={project.status}
                  progress={progress}
                  onCancel={() => api.cancel(id).then(refresh)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="shrink-0 border-t border-brand-border bg-brand-base">
        <button
          type="button"
          onClick={() => setLogsExpanded(!logsExpanded)}
          className="flex h-10 w-full items-center justify-between px-6 hover:bg-brand-raised/40 transition-colors text-xs text-zinc-500 cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="h-3.5 w-3.5 text-brand-amber shrink-0" />
            <span className="font-medium text-zinc-400 truncate">Pipeline logs</span>
            <span className="rounded bg-brand-raised border border-brand-border px-1.5 py-0.5 text-[10px] shrink-0">
              {logs.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {logsExpanded ? (
              <>
                <span>Collapse</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Expand</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </div>
        </button>

        <AnimatePresence>
          {logsExpanded && (
            <motion.div
              className="h-40 overflow-y-auto border-t border-brand-border bg-brand-base p-4 font-mono text-[11px] leading-relaxed"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 160, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              {...motionProps(reduce, duration * 0.85)}
            >
              <div className="space-y-1">
                {logs.map((log) => {
                  const isError = log.level === "ERROR";
                  const isWarning = log.level === "WARNING" || log.level === "WARN";
                  const levelColor = isError ? "text-brand-error" : isWarning ? "text-brand-amber" : "text-zinc-500";

                  return (
                    <div key={log.id} className="flex items-start gap-3 min-w-0 px-1 py-0.5 rounded hover:bg-brand-raised/20">
                      <span className="text-zinc-600 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                      <span className={`shrink-0 font-bold uppercase ${levelColor}`}>[{log.level}]</span>
                      <span className={`min-w-0 break-words ${isError ? "text-brand-error" : isWarning ? "text-brand-amber-hover" : "text-zinc-400"}`}>
                        {log.message}
                      </span>
                    </div>
                  );
                })}
                {logs.length === 0 && <div className="text-zinc-600 italic">No logs yet for this project.</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}
