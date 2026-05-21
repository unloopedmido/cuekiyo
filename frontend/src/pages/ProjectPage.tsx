import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Square } from "lucide-react";
import { useParams } from "react-router-dom";
import { api, connectWebSocket } from "../api";
import { errorToMessage } from "../lib/errors";
import CandidateSelection from "../components/CandidateSelection";
import ProgressPanel from "../components/ProgressPanel";
import RenderOrder from "../components/RenderOrder";
import SongSelection from "../components/SongSelection";
import CompletedOutput from "../components/CompletedOutput";
import PipelineTimeline from "../components/PipelineTimeline";
import ProjectHeader from "../components/ProjectHeader";
import { RUNNING_STATUSES, getStatusCopy } from "../pipeline";
import type { ProgressEvent, Project } from "../types";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!id) return;
    api.getProject(id).then(setProject).catch((e) => setError(errorToMessage(e)));
  }, [id]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    setProgress((prev) => (prev && prev.stage !== project?.status ? null : prev));
  }, [project?.status]);

  useEffect(() => {
    const ws = connectWebSocket((data) => {
      const ev = data as ProgressEvent;
      if (ev.projectId === id) {
        setProgress(ev);
        refresh();
      }
    });
    const t = setInterval(refresh, RUNNING_STATUSES.has(project?.status ?? "DRAFT") ? 3000 : 15000);
    return () => {
      ws.close();
      clearInterval(t);
    };
  }, [id, project?.status, refresh]);

  if (!id) return null;
  if (!project) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-white/[0.07]" />
      <div className="h-4 w-96 rounded bg-white/[0.07]" />
      <div className="h-10 w-full rounded-xl bg-white/[0.07]" />
    </div>
  );

  const status = getStatusCopy(project.status);
  const running = RUNNING_STATUSES.has(project.status);
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(project.status);

  return (
    <div>
      <ProjectHeader project={project} />
      <div className="mb-6">
        <PipelineTimeline status={project.status} />
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          {running && (
            <ProgressPanel
              projectId={id}
              projectStatus={project.status}
              progress={progress}
              onCancel={() => api.cancel(id).then(refresh)}
            />
          )}

          {project.status === "SONG_SELECTION" && <SongSelection project={project} onDone={refresh} />}
          {project.status === "AWAITING_CANDIDATES" && <CandidateSelection projectId={id} onDone={refresh} />}
          {project.status === "AWAITING_RENDER_ORDER" && <RenderOrder projectId={id} onDone={refresh} />}
          {project.status === "COMPLETED" && <CompletedOutput projectId={id} project={project} />}

          {project.status === "DRAFT" && (
            <div className="rounded-2xl border border-white/10 bg-panel/70 p-5">
              <h2 className="text-lg font-medium">Ready to load themes</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Theme loading is the first automatic stage. You will review songs after the app
                finds matching openings and endings.
              </p>
              <button
                className="mt-5 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio"
                onClick={() => api.loadThemes(id).then(refresh)}
              >
                Load themes
              </button>
            </div>
          )}

          {project.status === "FAILED" && (
            <div className="rounded-2xl border border-red-300/30 bg-red-300/10 p-5">
              <h2 className="text-lg font-medium text-red-100">A stage needs attention</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/80">
                Review the message and logs, then retry from the failed stage when the local issue
                is resolved.
              </p>
              {project.error_message && (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-studio/50 px-3 py-2 text-xs leading-5 text-red-100/70">{project.error_message}</pre>
              )}
              <button
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio"
                onClick={() => api.retry(id).then(refresh)}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Retry failed stage
              </button>
            </div>
          )}

          {project.status === "CANCELLED" && (
            <div className="rounded-2xl border border-white/10 bg-panel/70 p-5">
              <h2 className="flex items-center gap-2 text-lg font-medium">
                <Square size={16} aria-hidden="true" />
                Project stopped
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                This project is no longer running. Create a new project or delete this one from the
                projects home.
              </p>
            </div>
          )}
        </section>

        {!isTerminal && (
          <aside className="h-fit rounded-2xl border border-white/10 bg-panel/70 p-5">
            <h2 className="text-sm font-semibold">Current checkpoint</h2>
            <p className="mt-3 text-lg font-medium">{status.label}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{status.description}</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="text-muted">Anime</dt>
                <dd className="mt-1">{project.animes.map((anime) => anime.anime_name).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted">Song types</dt>
                <dd className="mt-1 capitalize">{project.song_types.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted">Encoder</dt>
                <dd className="mt-1">{project.encoder}</dd>
              </div>
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}
