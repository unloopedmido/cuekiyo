import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "../api";
import { motionProps, useMotionConfig } from "../lib/motion";
import { Film, Play, Sliders, Terminal } from "lucide-react";
import NewProjectModal from "../components/NewProjectModal";

export default function Dashboard() {
  const { reduce, duration } = useMotionConfig();
  const [projectsCount, setProjectsCount] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  useEffect(() => {
    api.listProjects().then((p) => setProjectsCount(p.length)).catch(() => {});

    const time = new Date().toLocaleTimeString();
    setTerminalLogs([
      `[${time}] Console ready.`,
      `[${time}] System binaries verified via sidebar.`,
      `[${time}] ${projectsCount || "No"} active projects.`,
    ]);
  }, [projectsCount]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-8 max-w-3xl mx-auto justify-center">
      <motion.div
        className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-brand-border bg-brand-raised/50 p-6 rounded-xl"
        initial={{ opacity: 0, y: reduce ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        {...motionProps(reduce, duration)}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-amber/10 border border-brand-amber/30 text-brand-amber">
            <Film className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100">Cut Room Console</h2>
            <p className="text-sm text-zinc-500">Build anime music video compilations on your machine.</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wide">Projects</div>
          <div className="text-sm font-mono font-semibold text-brand-amber">{projectsCount}</div>
        </div>
      </motion.div>

      <motion.div
        className="mb-8 border border-brand-border bg-brand-raised/30 p-5 rounded-lg"
        initial={{ opacity: 0, y: reduce ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <h3 className="text-xs font-medium text-zinc-400 mb-4 flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-brand-amber" aria-hidden />
          How it works
        </h3>
        <ol className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3 min-w-0">
            <span className="font-mono text-brand-amber font-semibold shrink-0">1</span>
            <span>Add anime sources and load theme metadata from MyAnimeList.</span>
          </li>
          <li className="flex gap-3 min-w-0">
            <span className="font-mono text-brand-amber font-semibold shrink-0">2</span>
            <span>Pick songs, review YouTube candidates with previews, and set render order.</span>
          </li>
          <li className="flex gap-3 min-w-0">
            <span className="font-mono text-brand-amber font-semibold shrink-0">3</span>
            <span>Let the pipeline download, normalize, cut, and render your compilation.</span>
          </li>
        </ol>
      </motion.div>

      <div className="text-center mb-8">
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-amber px-6 py-3 text-sm font-semibold text-brand-base hover:bg-brand-amber-hover transition-colors shadow-lg cursor-pointer"
        >
          <Play className="h-4 w-4 fill-current" />
          New compilation
        </button>
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-raised/40 p-4 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 border-b border-brand-border/40 pb-2 mb-3 text-zinc-500">
          <Terminal className="h-3.5 w-3.5 text-brand-amber" aria-hidden />
          <span>Status</span>
        </div>
        <div className="space-y-1 text-zinc-500 max-h-24 overflow-y-auto">
          {terminalLogs.map((log, i) => (
            <div key={i} className="break-words">{log}</div>
          ))}
        </div>
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={() => {
        window.dispatchEvent(new CustomEvent("projects-updated"));
      }} />}
    </div>
  );
}
