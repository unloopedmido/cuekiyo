import { CalendarClock, Film, Settings2 } from "lucide-react";
import type { Project } from "../types";

export default function ProjectHeader({ project }: { project: Project }) {
  return (
    <header className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="type-headline min-w-0 max-w-3xl text-soft">
          {project.title}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 type-label text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Film size={14} className="text-lime shrink-0" aria-hidden="true" />
            {project.songs_count} songs · {project.clip_time}s
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Settings2 size={14} className="shrink-0" aria-hidden="true" />
            {project.target_width}×{project.target_height}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock size={14} className="shrink-0" aria-hidden="true" />
            {new Date(project.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </header>
  );
}
