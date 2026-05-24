export type ProjectStatus =
  | "DRAFT"
  | "LOADING_THEMES"
  | "SONG_SELECTION"
  | "SOURCING"
  | "AWAITING_CANDIDATES"
  | "AWAITING_CLIP_TRIM"
  | "DOWNLOADING"
  | "PROBING_NORMALIZING"
  | "CUTTING"
  | "OVERLAYING"
  | "AWAITING_RENDER_ORDER"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface OverlayConfig {
  enabled: boolean;
  style: "default" | "minimal";
  position: "bottom" | "top";
  show_anime_name: boolean;
  show_song_line: boolean;
  show_meta_line: boolean;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  songs_count: number;
  song_types: string[];
  clip_time: number;
  target_width: number;
  target_height: number;
  target_fps: number;
  target_aspect_ratio: string;
  encoder: string;
  audio_normalize: boolean;
  source_mode: "auto" | "manual";
  overlay_config: OverlayConfig;
  output_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  animes: {
    anime_mal_id: number;
    anime_name: string;
    display_order: number;
    image_url?: string | null;
  }[];
}

export interface ThemeSong {
  id: string;
  anime_mal_id: number;
  song_type: "opening" | "ending";
  song_number: number;
  song_title: string;
  artist: string | null;
  raw_text: string;
}

export interface Song {
  id: string;
  project_id: string;
  anime_mal_id: number;
  anime_name: string;
  song_type: string;
  song_number: number;
  song_title: string;
  artist: string | null;
  selected_candidate_id: string | null;
  render_order: number;
  status: string;
  cut_start_time: number | null;
  cut_end_time: number | null;
  clip_time: number | null;
}

export interface Candidate {
  id: string;
  song_id: string;
  youtube_id: string;
  url: string;
  title: string;
  uploader_name: string | null;
  view_count: number | null;
  duration: number | null;
  thumbnail_url: string | null;
  score: number;
  rank: number;
  is_selected: boolean;
  is_manual: boolean;
  rejection_flags: string[];
}

export interface Job {
  id: string;
  project_id: string;
  type: string;
  status: string;
  progress: number;
  current_step: string | null;
  error_message: string | null;
}

export interface ProgressEvent {
  type: string;
  projectId: string;
  jobId: string;
  stage: string;
  progress: number;
  message: string;
}
