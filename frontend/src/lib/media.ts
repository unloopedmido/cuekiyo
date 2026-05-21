import type { Candidate } from "../types";

export function youtubeThumbnail(youtubeId: string, quality: "default" | "hq" = "hq"): string {
  const file = quality === "hq" ? "hqdefault.jpg" : "default.jpg";
  return `https://i.ytimg.com/vi/${youtubeId}/${file}`;
}

export function candidateThumbnail(candidate: Pick<Candidate, "thumbnail_url" | "youtube_id">): string | null {
  if (candidate.thumbnail_url) return candidate.thumbnail_url;
  if (candidate.youtube_id) return youtubeThumbnail(candidate.youtube_id);
  return null;
}
