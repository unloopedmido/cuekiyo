import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, connectWebSocket } from "../api";
import StatusBadge from "../components/StatusBadge";
import CandidateSelection from "../components/CandidateSelection";
import ProgressPanel from "../components/ProgressPanel";
import RenderOrder from "../components/RenderOrder";
import SongSelection from "../components/SongSelection";
import CompletedOutput from "../components/CompletedOutput";
import type { ProgressEvent, Project } from "../types";

const RUNNING = new Set([
  "LOADING_THEMES",
  "SOURCING",
  "DOWNLOADING",
  "PROBING_NORMALIZING",
  "CUTTING",
  "OVERLAYING",
  "RENDERING",
]);

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!id) return;
    api.getProject(id).then(setProject).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    const ws = connectWebSocket((data) => {
      const ev = data as ProgressEvent;
      if (ev.projectId === id) {
        setProgress(ev);
        refresh();
      }
    });
    const t = setInterval(refresh, RUNNING.has(project?.status ?? "") ? 3000 : 15000);
    return () => {
      ws.close();
      clearInterval(t);
    };
  }, [id, project?.status, refresh]);

  if (!id) return null;
  if (!project) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-semibold">{project.title}</h2>
        <StatusBadge status={project.status} />
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      {project.error_message && (
        <p className="mb-4 rounded border border-red-900 bg-red-950/40 p-3 text-sm">{project.error_message}</p>
      )}

      {RUNNING.has(project.status) && (
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
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-sm"
          onClick={() => api.loadThemes(id).then(refresh)}
        >
          Load themes
        </button>
      )}

      {project.status === "FAILED" && (
        <button className="rounded bg-amber-700 px-4 py-2 text-sm" onClick={() => api.retry(id).then(refresh)}>
          Retry failed stage
        </button>
      )}
    </div>
  );
}
