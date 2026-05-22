import type { ProjectStatus } from "./types"

export type StageId =
  | "setup"
  | "themes"
  | "songs"
  | "candidates"
  | "processing"
  | "order"
  | "render"
  | "output"

export type StatusTone =
  | "idle"
  | "running"
  | "attention"
  | "success"
  | "danger"
  | "muted"

export interface PipelineStage {
  id: StageId
  label: string
  description: string
  statuses: ProjectStatus[]
}

export interface StatusCopy {
  label: string
  description: string
  tone: StatusTone
}

export const RUNNING_STATUSES = new Set<ProjectStatus>([
  "LOADING_THEMES",
  "SOURCING",
  "DOWNLOADING",
  "PROBING_NORMALIZING",
  "CUTTING",
  "OVERLAYING",
  "RENDERING",
])

const USER_GATED_STATUSES = new Set<ProjectStatus>([
  "SONG_SELECTION",
  "AWAITING_CANDIDATES",
  "AWAITING_RENDER_ORDER",
])

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "setup",
    label: "Start",
    description: "Name the compilation and pick anime",
    statuses: ["DRAFT"],
  },
  {
    id: "themes",
    label: "Load themes",
    description: "Gather opening and ending tracks",
    statuses: ["LOADING_THEMES"],
  },
  {
    id: "songs",
    label: "Pick songs",
    description: "Choose the music that sets the edit",
    statuses: ["SONG_SELECTION", "SOURCING"],
  },
  {
    id: "candidates",
    label: "Review clips",
    description: "Pick the best source for each song",
    statuses: ["AWAITING_CANDIDATES"],
  },
  {
    id: "processing",
    label: "Prepare clips",
    description: "Download, trim, and add overlays",
    statuses: ["DOWNLOADING", "PROBING_NORMALIZING", "CUTTING", "OVERLAYING"],
  },
  {
    id: "order",
    label: "Set order",
    description: "Arrange the sequence before export",
    statuses: ["AWAITING_RENDER_ORDER"],
  },
  {
    id: "render",
    label: "Render video",
    description: "Combine clips into the final MP4",
    statuses: ["RENDERING"],
  },
  {
    id: "output",
    label: "Finished",
    description: "Watch, download, or open the file",
    statuses: ["COMPLETED", "FAILED", "CANCELLED"],
  },
]

const STATUS_COPY: Record<ProjectStatus, StatusCopy> = {
  DRAFT: {
    label: "Ready to start",
    description: "Compilation saved. Load themes when you are ready.",
    tone: "idle",
  },
  LOADING_THEMES: {
    label: "Loading themes",
    description: "Finding opening and ending themes for the selected anime.",
    tone: "running",
  },
  SONG_SELECTION: {
    label: "Review songs",
    description: "Choose the tracks that should shape this compilation.",
    tone: "attention",
  },
  SOURCING: {
    label: "Sourcing candidates",
    description: "Searching for candidate clips for the selected songs.",
    tone: "running",
  },
  AWAITING_CANDIDATES: {
    label: "Review candidates",
    description: "Pick the best source clip for each song.",
    tone: "attention",
  },
  DOWNLOADING: {
    label: "Downloading clips",
    description: "Saving selected sources locally.",
    tone: "running",
  },
  PROBING_NORMALIZING: {
    label: "Preparing clips",
    description: "Checking media details and normalizing audio.",
    tone: "running",
  },
  CUTTING: {
    label: "Cutting moments",
    description: "Trimming clips to the requested duration.",
    tone: "running",
  },
  OVERLAYING: {
    label: "Adding overlays",
    description: "Applying title and song overlays.",
    tone: "running",
  },
  AWAITING_RENDER_ORDER: {
    label: "Arrange render order",
    description: "Set the sequence before the final render starts.",
    tone: "attention",
  },
  RENDERING: {
    label: "Rendering final video",
    description: "Combining the selected clips into the final MP4.",
    tone: "running",
  },
  COMPLETED: {
    label: "Output ready",
    description: "The final video is ready to review.",
    tone: "success",
  },
  FAILED: {
    label: "Needs attention",
    description: "A stage failed. Review the issue, then retry when ready.",
    tone: "danger",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "The project was stopped before completion.",
    tone: "muted",
  },
}

export function getStatusCopy(status: ProjectStatus): StatusCopy {
  return STATUS_COPY[status]
}

export function getProjectStage(status: ProjectStatus): PipelineStage {
  return (
    PIPELINE_STAGES.find((stage) => stage.statuses.includes(status)) ??
    PIPELINE_STAGES[0]
  )
}

export function getProjectAction(status: ProjectStatus): string {
  if (status === "DRAFT") return "Load themes"
  if (status === "SONG_SELECTION") return "Review songs"
  if (status === "AWAITING_CANDIDATES") return "Review candidates"
  if (status === "AWAITING_RENDER_ORDER") return "Arrange order"
  if (status === "COMPLETED") return "Open output"
  if (status === "FAILED") return "Review issue"
  if (status === "CANCELLED") return "Stopped"
  return getStatusCopy(status).label
}

export function isUserGatedStatus(status: ProjectStatus): boolean {
  return USER_GATED_STATUSES.has(status)
}

export function getStageIndex(status: ProjectStatus): number {
  const stage = getProjectStage(status)
  return PIPELINE_STAGES.findIndex((item) => item.id === stage.id)
}
