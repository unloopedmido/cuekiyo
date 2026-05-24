import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock01Icon, Scissor01Icon } from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { errorToMessage } from "@/lib/errors"
import {
  clampClipStart,
  effectiveClipDuration,
  maxClipStart,
  usesHeatmapStart,
} from "@/lib/clip-trim"
import type { Project, Song } from "@/types"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type SongTrimState = {
  cutStartTime: number | null
  clipTime: number
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function formatSeconds(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function ClipTrimEditor({
  projectId,
  project,
  onDone,
}: {
  projectId: string
  project: Project
  onDone: () => void
}) {
  const [songs, setSongs] = useState<Song[]>([])
  const [durations, setDurations] = useState<Record<string, number | null>>({})
  const [trimState, setTrimState] = useState<Record<string, SongTrimState>>({})
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingSongId, setSavingSongId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  useEffect(() => {
    let cancelled = false
    const timers = debounceTimers.current
    api
      .listSongs(projectId)
      .then(async (loadedSongs) => {
        const durationMap: Record<string, number | null> = {}
        await Promise.all(
          loadedSongs.map(async (song) => {
            if (!song.selected_candidate_id) {
              durationMap[song.id] = null
              return
            }
            const candidates = await api.listCandidates(projectId, song.id)
            const selected = candidates.find(
              (candidate) => candidate.id === song.selected_candidate_id
            )
            durationMap[song.id] = selected?.duration ?? null
          })
        )
        if (cancelled) return
        const initialTrim: Record<string, SongTrimState> = {}
        for (const song of loadedSongs) {
          initialTrim[song.id] = {
            cutStartTime: song.cut_start_time,
            clipTime: effectiveClipDuration(song, project.clip_time),
          }
        }
        setSongs(loadedSongs)
        setDurations(durationMap)
        setTrimState(initialTrim)
        setActiveSongId(loadedSongs[0]?.id ?? null)
      })
      .catch((e) => {
        if (cancelled) return
        const msg = errorToMessage(e)
        setError(msg)
        toast.error(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [projectId, project.clip_time])

  const persistTrim = (
    songId: string,
    next: SongTrimState,
    options?: { immediate?: boolean }
  ) => {
    setTrimState((prev) => ({ ...prev, [songId]: next }))

    const existing = debounceTimers.current.get(songId)
    if (existing) clearTimeout(existing)

    const run = () => {
      debounceTimers.current.delete(songId)
      setSavingSongId(songId)
      api
        .updateSongClip(projectId, songId, {
          cut_start_time: next.cutStartTime,
          clip_time: next.clipTime,
        })
        .then((updated) => {
          setSongs((prev) =>
            prev.map((song) => (song.id === songId ? updated : song))
          )
        })
        .catch((e) => toast.error(errorToMessage(e)))
        .finally(() => {
          setSavingSongId((current) => (current === songId ? null : current))
        })
    }

    if (options?.immediate) {
      run()
      return
    }

    debounceTimers.current.set(songId, setTimeout(run, 450))
  }

  const updateStartInput = (song: Song, rawValue: string) => {
    const clipDuration = trimState[song.id]?.clipTime ?? project.clip_time
    const videoDuration = durations[song.id]
    const parsed = parseOptionalNumber(rawValue)
    const nextStart =
      parsed == null
        ? null
        : clampClipStart(parsed, videoDuration, clipDuration)
    persistTrim(song.id, {
      cutStartTime: nextStart,
      clipTime: clipDuration,
    })
  }

  const updateDurationInput = (song: Song, rawValue: string) => {
    const parsed = parseOptionalNumber(rawValue)
    const fallback = effectiveClipDuration(song, project.clip_time)
    const clipDuration = Math.min(
      120,
      Math.max(1, parsed ?? fallback)
    )
    const videoDuration = durations[song.id]
    const currentStart = trimState[song.id]?.cutStartTime ?? null
    const nextStart =
      currentStart == null
        ? null
        : clampClipStart(currentStart, videoDuration, clipDuration)
    persistTrim(song.id, {
      cutStartTime: nextStart,
      clipTime: clipDuration,
    })
  }

  const applyHeatmapStart = (song: Song) => {
    const clipDuration = trimState[song.id]?.clipTime ?? project.clip_time
    persistTrim(
      song.id,
      { cutStartTime: null, clipTime: clipDuration },
      { immediate: true }
    )
  }

  const confirm = () => {
    if (confirming) return
    setConfirming(true)
    api
      .confirmClipTrim(projectId)
      .then(() => {
        toast.success("Clip trim confirmed")
        onDone()
      })
      .catch((e) => toast.error(errorToMessage(e)))
      .finally(() => setConfirming(false))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold">Trim clips</h2>
        <p className="text-sm text-muted-foreground">
          Set where each clip starts and how long it runs. Leave start empty to
          use the YouTube heatmap during processing.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Tabs
        value={activeSongId ?? undefined}
        onValueChange={setActiveSongId}
        className="flex flex-col gap-4"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {songs.map((song) => {
            const state = trimState[song.id]
            const heatmap = state
              ? usesHeatmapStart({ cut_start_time: state.cutStartTime })
              : true
            return (
              <TabsTrigger
                key={song.id}
                value={song.id}
                className="gap-2 rounded-lg border border-transparent data-[state=active]:border-border data-[state=active]:bg-muted"
              >
                <span className="max-w-[8rem] truncate">{song.song_title}</span>
                <Badge
                  variant={heatmap ? "outline" : "secondary"}
                  className="h-5 px-1.5 text-[10px]"
                >
                  {heatmap ? "Auto" : "Manual"}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {songs.map((song) => {
          const state = trimState[song.id]
          const videoDuration = durations[song.id]
          const clipDuration =
            state?.clipTime ?? effectiveClipDuration(song, project.clip_time)
          const startValue =
            state?.cutStartTime == null ? "" : formatSeconds(state.cutStartTime)
          const maxStart = maxClipStart(videoDuration, clipDuration)
          const heatmap = state
            ? usesHeatmapStart({ cut_start_time: state.cutStartTime })
            : true

          return (
            <TabsContent
              key={song.id}
              value={song.id}
              className="mt-0 flex flex-col gap-5"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium">{song.song_title}</p>
                <p className="text-sm text-muted-foreground">{song.anime_name}</p>
                {videoDuration != null ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Source length {formatSeconds(videoDuration)}s
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Start time (seconds)</span>
                  <InputGroup className="h-10">
                    <InputGroupAddon align="inline-start">
                      <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
                    </InputGroupAddon>
                    <InputGroupInput
                      inputMode="decimal"
                      placeholder="Heatmap auto"
                      value={startValue}
                      onChange={(event) =>
                        updateStartInput(song, event.target.value)
                      }
                    />
                  </InputGroup>
                  <span className="text-xs text-muted-foreground">
                    {heatmap
                      ? "Start will be chosen from the heatmap."
                      : `Clip begins at ${startValue}s (max ${formatSeconds(maxStart)}s).`}
                  </span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Clip length (seconds)</span>
                  <InputGroup className="h-10">
                    <InputGroupAddon align="inline-start">
                      <HugeiconsIcon icon={Scissor01Icon} strokeWidth={2} />
                    </InputGroupAddon>
                    <InputGroupInput
                      inputMode="decimal"
                      value={formatSeconds(clipDuration)}
                      onChange={(event) =>
                        updateDurationInput(song, event.target.value)
                      }
                    />
                  </InputGroup>
                  <span className="text-xs text-muted-foreground">
                    Default project clip length is {project.clip_time}s.
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={heatmap || savingSongId === song.id}
                  onClick={() => applyHeatmapStart(song)}
                >
                  Use heatmap
                </Button>
                {savingSongId === song.id && (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoadingSpinner />
                    Saving&hellip;
                  </span>
                )}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>

      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <p className="text-sm text-muted-foreground">
          Confirm when every song has the start and length you want. Download
          begins right after.
        </p>
        <Button disabled={confirming || songs.length === 0} onClick={confirm}>
          {confirming && <LoadingSpinner data-icon="inline-start" />}
          Confirm trim and download
        </Button>
      </div>
    </section>
  )
}
