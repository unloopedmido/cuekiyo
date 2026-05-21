import type { ProjectStatus } from "../types";

export const USER_GATES = new Set<ProjectStatus>([
  "SONG_SELECTION",
  "AWAITING_CANDIDATES",
  "AWAITING_RENDER_ORDER",
]);

export const RUNNING_STATUSES = new Set<ProjectStatus>([
  "LOADING_THEMES",
  "SOURCING",
  "DOWNLOADING",
  "PROBING_NORMALIZING",
  "CUTTING",
  "OVERLAYING",
  "RENDERING",
]);
