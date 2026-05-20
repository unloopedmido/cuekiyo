import type { ProjectStatus } from "../types";

const COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-700",
  LOADING_THEMES: "bg-blue-700",
  SONG_SELECTION: "bg-indigo-700",
  SOURCING: "bg-purple-700",
  AWAITING_CANDIDATES: "bg-amber-700",
  DOWNLOADING: "bg-cyan-700",
  PROBING_NORMALIZING: "bg-teal-700",
  CUTTING: "bg-teal-800",
  OVERLAYING: "bg-emerald-700",
  AWAITING_RENDER_ORDER: "bg-orange-700",
  RENDERING: "bg-rose-700",
  COMPLETED: "bg-green-700",
  FAILED: "bg-red-700",
  CANCELLED: "bg-zinc-600",
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? "bg-zinc-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
