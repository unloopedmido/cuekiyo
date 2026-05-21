import { CalendarClock, Film, Settings2 } from "lucide-react";
import { getProjectAction, getStatusCopy } from "../pipeline";
import type { Project } from "../types";
import StatusBadge from "./StatusBadge";

export default function ProjectHeader({ project }: { project: Project }) {
  const status = getStatusCopy(project.status);

  return (
    <header className="mb-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-muted">
              {getProjectAction(project.status)}
            </span>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-soft md:text-4xl">
            {project.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{status.description}</p>
        </div>
        <div className="grid min-w-72 gap-2 rounded-2xl border border-white/10 bg-panel/70 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Film size={16} className="text-lime" aria-hidden="true" />
            <span>
              {project.songs_count} songs, {project.clip_time}s clips
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Settings2 size={16} aria-hidden="true" />
            <span>
              {project.target_width}x{project.target_height}, {project.target_fps} fps
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarClock size={16} aria-hidden="true" />
            <span>Updated {new Date(project.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
