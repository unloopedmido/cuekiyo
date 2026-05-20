import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import NewProjectModal from "../components/NewProjectModal";
import type { Project } from "../types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [binaries, setBinaries] = useState<Record<string, { available: boolean; detail: string }>>({});
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.listProjects().then(setProjects).catch((e) => setError(String(e)));
    api.binaries().then(setBinaries).catch(() => {});
  };

  useEffect(load, []);

  const missing = Object.entries(binaries).filter(([, v]) => !v.available);

  return (
    <div>
      {missing.length > 0 && (
        <div className="mb-4 rounded border border-amber-800 bg-amber-950/50 p-3 text-sm">
          Missing tools: {missing.map(([k]) => k).join(", ")}. Install yt-dlp, ffmpeg, ffprobe,
          and a font package such as <code className="text-amber-200">dejavu-fontconfig</code>.
        </div>
      )}
      <div className="mb-6 flex justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <button
          onClick={() => setShowNew(true)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          New project
        </button>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
          >
            <Link to={`/projects/${p.id}`} className="font-medium hover:text-indigo-300">
              {p.title}
            </Link>
            <div className="flex items-center gap-3">
              <StatusBadge status={p.status} />
              <button
                className="text-xs text-zinc-500 hover:text-red-400"
                onClick={async () => {
                  if (confirm("Delete project?")) {
                    await api.deleteProject(p.id);
                    load();
                  }
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {projects.length === 0 && (
          <p className="text-zinc-500">No projects yet. Create one to get started.</p>
        )}
      </ul>
      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}
