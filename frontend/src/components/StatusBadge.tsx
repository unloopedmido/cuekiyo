import type { ProjectStatus } from "../types";

const STYLES: Record<ProjectStatus, { border: string; bg: string; text: string; label: string; pulse?: boolean }> = {
  DRAFT: {
    border: "border-brand-border",
    bg: "bg-brand-raised/50",
    text: "text-zinc-400",
    label: "Draft",
  },
  LOADING_THEMES: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Loading themes",
    pulse: true,
  },
  SONG_SELECTION: {
    border: "border-brand-amber",
    bg: "bg-brand-amber-dim",
    text: "text-brand-amber font-medium",
    label: "Pick songs",
  },
  SOURCING: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Sourcing",
    pulse: true,
  },
  AWAITING_CANDIDATES: {
    border: "border-brand-amber",
    bg: "bg-brand-amber-dim",
    text: "text-brand-amber font-medium",
    label: "Pick clips",
  },
  DOWNLOADING: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Downloading",
    pulse: true,
  },
  PROBING_NORMALIZING: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Normalizing",
    pulse: true,
  },
  CUTTING: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Cutting",
    pulse: true,
  },
  OVERLAYING: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Overlaying",
    pulse: true,
  },
  AWAITING_RENDER_ORDER: {
    border: "border-brand-amber",
    bg: "bg-brand-amber-dim",
    text: "text-brand-amber font-medium",
    label: "Set order",
  },
  RENDERING: {
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/5",
    text: "text-brand-amber",
    label: "Rendering",
    pulse: true,
  },
  COMPLETED: {
    border: "border-brand-success/30",
    bg: "bg-brand-success/5",
    text: "text-brand-success",
    label: "Complete",
  },
  FAILED: {
    border: "border-brand-error/30",
    bg: "bg-brand-error/5",
    text: "text-brand-error font-medium",
    label: "Failed",
  },
  CANCELLED: {
    border: "border-brand-border",
    bg: "bg-brand-raised/20",
    text: "text-zinc-500",
    label: "Cancelled",
  },
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STYLES[status] || {
    border: "border-brand-border",
    bg: "bg-brand-raised/50",
    text: "text-zinc-400",
    label: status.replace(/_/g, " ").toLowerCase(),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 text-[11px] transition-colors ${cfg.border} ${cfg.bg} ${cfg.text}`}
    >
      {cfg.pulse && (
        <span className="h-1.5 w-1.5 rounded-full bg-brand-amber motion-safe:animate-pulse" aria-hidden />
      )}
      {cfg.label}
    </span>
  );
}
