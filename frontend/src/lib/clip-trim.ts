import type { Song } from "@/types"

export function effectiveClipDuration(
  song: Pick<Song, "clip_time">,
  projectClipTime: number
): number {
  return song.clip_time ?? projectClipTime
}

export function usesHeatmapStart(song: Pick<Song, "cut_start_time">): boolean {
  return song.cut_start_time == null
}

export function maxClipStart(
  videoDuration: number | null | undefined,
  clipDuration: number
): number {
  if (videoDuration == null || videoDuration <= clipDuration) return 0
  return Math.max(0, videoDuration - clipDuration)
}

export function clampClipStart(
  start: number,
  videoDuration: number | null | undefined,
  clipDuration: number
): number {
  const maxStart = maxClipStart(videoDuration, clipDuration)
  if (!Number.isFinite(start) || start < 0) return 0
  return Math.min(start, maxStart)
}
