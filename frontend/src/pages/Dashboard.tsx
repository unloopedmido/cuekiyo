import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Trash2, TriangleAlert } from "lucide-react";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import type { Project } from "../types";
import { getProjectAction, getStatusCopy } from "../pipeline";
import { errorToMessage } from "../lib/errors";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [binaries, setBinaries] = useState<Record<string, { available: boolean; detail: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = () => {
    api.listProjects().then(setProjects).catch((e) => setError(errorToMessage(e)));
    api.binaries().then(setBinaries).catch(() => {});
  };

  useEffect(load, []);

  const missing = Object.entries(binaries).filter(([, v]) => !v.available);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-lime">Projects</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your local MV studio</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Start a compilation, return to checkpoints that need taste, or open finished outputs.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio"
        >
          <Plus size={16} aria-hidden="true" />
          New project
        </Link>
      </div>

      {missing.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Some local tools are missing.</p>
            <p className="mt-1 text-amber-100/80">
              Missing: {missing.map(([k]) => k).join(", ")}. Install the tools before running a
              full render.
            </p>
          </div>
        </div>
      )}
      {error && <p className="mb-4 rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-200">{error}</p>}
      <ul className="space-y-3">
        {projects.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-white/10 bg-panel/70 p-4 transition hover:border-white/20"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-muted">Updated {timeAgo(p.updated_at)}</span>
                </div>
                <Link to={`/projects/${p.id}`} className="text-lg font-medium hover:text-lime">
                  {p.title}
                </Link>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {getStatusCopy(p.status).description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pendingDeleteId === p.id ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs text-muted">Delete this project?</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-xl border border-red-300/40 px-3 py-2 text-sm text-red-200 hover:bg-red-300/10"
                        onClick={() => {
                          api.deleteProject(p.id).then(() => { load(); setPendingDeleteId(null); }).catch(() => setPendingDeleteId(null));
                        }}
                      >
                        Delete
                      </button>
                      <button
                        className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.06]"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {p.status === "CANCELLED" ? (
                      <span className="text-xs text-muted">Stopped</span>
                    ) : (
                      <Link
                        to={`/projects/${p.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/[0.06]"
                      >
                        {getProjectAction(p.status)}
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                    <button
                      className="grid size-10 place-items-center rounded-xl border border-white/10 text-muted hover:border-red-300/40 hover:text-red-200"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => setPendingDeleteId(p.id)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="rounded-2xl border border-white/10 bg-panel/60 p-8">
            <h2 className="text-xl font-medium">No projects yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Create a project, pick a few anime, and the app will load themes before asking for
              your first taste decision.
            </p>
            <Link
              to="/projects/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio"
            >
              <Plus size={16} aria-hidden="true" />
              Create first project
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
