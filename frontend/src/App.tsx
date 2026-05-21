import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Route, Routes, Link, useMatch, useNavigate } from "react-router-dom";
import { api } from "./api";
import type { Project } from "./types";
import Dashboard from "./pages/Dashboard";
import ProjectPage from "./pages/ProjectPage";
import NewProjectModal from "./components/NewProjectModal";
import { Film, Plus, Trash2, Terminal } from "lucide-react";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [binaries, setBinaries] = useState<Record<string, { available: boolean; detail: string }>>({});
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const match = useMatch("/projects/:id");
  const activeProjectId = match?.params.id;
  const navigate = useNavigate();

  const loadProjects = () => {
    api.listProjects()
      .then(setProjects)
      .catch((e) => console.error("Failed to load projects:", e));
  };

  const loadBinaries = () => {
    setLoading(true);
    api.binaries()
      .then(setBinaries)
      .catch((e) => console.error("Failed to load binaries:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
    loadBinaries();

    const handler = () => loadProjects();
    window.addEventListener("projects-updated", handler);
    const focusHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ active: boolean }>).detail;
      setFocusMode(!!detail?.active);
    };
    window.addEventListener("project-focus-mode", focusHandler);
    return () => {
      window.removeEventListener("projects-updated", handler);
      window.removeEventListener("project-focus-mode", focusHandler);
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete project "${title}"?`)) {
      try {
        await api.deleteProject(id);
        window.dispatchEvent(new CustomEvent("projects-updated"));
        if (activeProjectId === id) {
          navigate("/");
        }
      } catch (err) {
        alert("Failed to delete project: " + err);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-base text-zinc-100 font-sans">
      <aside
        className={`flex w-64 shrink-0 flex-col border-r border-brand-border bg-brand-base p-4 transition-opacity duration-300 ${
          focusMode ? "opacity-55 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Brand Logo */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-amber/10 border border-brand-amber/30 text-brand-amber">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <Link to="/" className="text-sm font-semibold tracking-wide text-zinc-100 hover:text-brand-amber transition-colors">
              Cut Room
            </Link>
            <div className="text-[10px] font-mono text-zinc-500">local · v1.0</div>
          </div>
        </div>

        {/* Projects Navigation */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold tracking-widest text-zinc-500 uppercase">Projects</span>
            <button
              onClick={() => setShowNew(true)}
              className="flex h-5 w-5 items-center justify-center rounded border border-brand-border bg-brand-raised text-zinc-400 hover:border-brand-amber hover:text-brand-amber transition-all cursor-pointer"
              title="New Project"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <ul className="mb-6 space-y-1">
            {projects.map((p) => {
              const isActive = p.id === activeProjectId;
              return (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className={`group flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-all ${
                      isActive
                        ? "border-brand-amber bg-brand-amber-dim text-brand-amber"
                        : "border-transparent text-zinc-400 hover:bg-brand-raised hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Terminal className={`h-4 w-4 shrink-0 ${isActive ? "text-brand-amber" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                      <span className="truncate font-medium">{p.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, p.id, p.title)}
                      className="hidden group-hover:block rounded p-0.5 text-zinc-500 hover:bg-brand-border hover:text-brand-error transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </li>
              );
            })}
            {projects.length === 0 && (
              <div className="rounded-md border border-dashed border-brand-border p-3 text-center text-xs text-zinc-500">
                No active projects
              </div>
            )}
          </ul>
        </div>

        {/* System Health */}
        <div className="mt-auto border-t border-brand-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold tracking-widest text-zinc-500 uppercase">System Health</span>
            <button
              onClick={loadBinaries}
              disabled={loading}
              className={`text-[10px] font-mono text-brand-amber hover:text-brand-amber-hover cursor-pointer ${loading ? "opacity-50" : ""}`}
            >
              [RECHECK]
            </button>
          </div>
          <ul className="space-y-1.5 text-xs font-mono">
            {Object.entries(binaries).map(([name, status]) => (
              <li key={name} className="flex items-center justify-between rounded bg-brand-raised/50 px-2 py-1 border border-brand-border/30">
                <span className="text-zinc-400">{name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.available ? "bg-brand-success" : "bg-brand-error"}`} />
                  <span className={status.available ? "text-zinc-300" : "text-brand-error"}>
                    {status.available ? "ready" : "missing"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden bg-brand-base">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
        </Routes>
      </main>

      <AnimatePresence>
        {showNew && (
          <NewProjectModal onClose={() => setShowNew(false)} onCreated={() => {
            window.dispatchEvent(new CustomEvent("projects-updated"));
            setShowNew(false);
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

