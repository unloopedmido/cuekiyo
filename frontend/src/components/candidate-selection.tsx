import { useDeferredValue, useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare01Icon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { errorToMessage } from "@/lib/errors"
import { nextUnselectedSongId } from "@/lib/candidate-selection"
import { candidateThumbnail } from "@/lib/youtube"
import { YoutubePreview } from "@/components/youtube-preview"
import type { Candidate, Song } from "@/types"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export function CandidateSelection({
  projectId,
  onDone,
}: {
  projectId: string
  onDone: () => void
}) {
  const [songs, setSongs] = useState<Song[]>([])
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({})
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [queries, setQueries] = useState<Record<string, string>>({})
  const [selecting, setSelecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeQuery = queries[activeSongId ?? ""] ?? ""
  const deferredQuery = useDeferredValue(activeQuery)

  useEffect(() => {
    let cancelled = false
    api
      .listSongs(projectId)
      .then(async (s) => {
        const map: Record<string, Candidate[]> = {}
        await Promise.all(
          s.map(async (song) => {
            map[song.id] = await api.listCandidates(projectId, song.id)
          })
        )
        if (cancelled) return
        setSongs(s)
        setCandidates(map)
        setActiveSongId(
          (current) =>
            current ??
            s.find((song) => !song.selected_candidate_id)?.id ??
            s[0]?.id ??
            null
        )
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
    }
  }, [projectId])

  const select = (songId: string, candidateId: string) => {
    if (selecting) return
    setSelecting(true)
    api
      .selectCandidate(projectId, songId, candidateId)
      .then(() => {
        setSongs((prev) =>
          prev.map((s) =>
            s.id === songId ? { ...s, selected_candidate_id: candidateId } : s
          )
        )
        toast.success("Clip locked in")
        onDone()
        const nextSongId = nextUnselectedSongId(songs, songId)
        if (nextSongId) setActiveSongId(nextSongId)
      })
      .catch((e) => toast.error(errorToMessage(e)))
      .finally(() => setSelecting(false))
  }

  const allSelected =
    songs.length > 0 && songs.every((s) => s.selected_candidate_id)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="aspect-video w-full max-w-2xl rounded-xl" />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold">Review clips</h2>
        <p className="text-sm text-muted-foreground">
          One source per song. Thumbnails help you judge framing before
          download.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {allSelected && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          All songs have a selected clip. Processing continues automatically.
        </div>
      )}

      <Tabs
        value={activeSongId ?? undefined}
        onValueChange={setActiveSongId}
        className="flex flex-col gap-4"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {songs.map((song) => (
            <TabsTrigger
              key={song.id}
              value={song.id}
              className="gap-2 rounded-lg border border-transparent data-[state=active]:border-border data-[state=active]:bg-muted"
            >
              <span className="max-w-[8rem] truncate">{song.song_title}</span>
              {song.selected_candidate_id && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  OK
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {songs.map((song) => {
          const list = candidates[song.id] ?? []
          const q = deferredQuery.trim().toLowerCase()
          const filtered = q
            ? list.filter(
                (c) =>
                  c.title.toLowerCase().includes(q) ||
                  (c.uploader_name ?? "").toLowerCase().includes(q)
              )
            : list
          const activeCandidate =
            list.find((c) => c.id === song.selected_candidate_id) ??
            filtered[0] ??
            null

          const songQuery = queries[song.id] ?? ""

          return (
            <TabsContent
              key={song.id}
              value={song.id}
              className="mt-0 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-medium">{song.song_title}</p>
                  <p className="text-sm text-muted-foreground">
                    {song.anime_name}
                  </p>
                </div>
                <InputGroup className="h-9 w-full sm:max-w-xs">
                  <InputGroupAddon align="inline-start">
                    <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={songQuery}
                    onChange={(e) =>
                      setQueries((prev) => ({
                        ...prev,
                        [song.id]: e.target.value,
                      }))
                    }
                    placeholder="Filter candidates"
                  />
                  {songQuery && (
                    <InputGroupAddon align="inline-end">
                      <button
                        type="button"
                        onClick={() =>
                          setQueries((prev) => ({
                            ...prev,
                            [song.id]: "",
                          }))
                        }
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Clear
                      </button>
                    </InputGroupAddon>
                  )}
                </InputGroup>
              </div>

              {activeCandidate ? (
                <YoutubePreview
                  youtubeId={activeCandidate.youtube_id}
                  title={activeCandidate.title}
                />
              ) : null}

              <ScrollArea className="w-full">
                <ul className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((c) => {
                    const thumb = candidateThumbnail(c)
                    const isSelected = song.selected_candidate_id === c.id
                    return (
                      <li key={c.id} className="flex min-h-0">
                        <button
                          type="button"
                          disabled={selecting}
                          onClick={() => void select(song.id, c.id)}
                          className={cn(
                            "group flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-200",
                            isSelected
                              ? "border-primary/40 shadow-[0_0_16px_oklch(from_var(--primary)_l_c_h_/0.08)]"
                              : "border-border/60 hover:border-border"
                          )}
                        >
                          <div className="relative aspect-video w-full shrink-0 bg-muted">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="size-full object-cover transition-[filter] duration-200 group-hover:brightness-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                No preview
                              </div>
                            )}
                            {isSelected && (
                              <span aria-label="Selected" className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h_/0.25)]">
                                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-3.5 text-primary" />
                              </span>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1.5 p-3">
                            <span
                              className="line-clamp-2 h-10 text-sm leading-5 font-medium"
                              title={c.title}
                            >
                              {c.title}
                            </span>
                            <div className="flex min-h-4 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
                              <span
                                className="min-w-0 flex-1 truncate"
                                title={c.uploader_name ?? "Unknown"}
                              >
                                {c.uploader_name ?? "Unknown"}
                              </span>
                              <span
                                className="shrink-0 whitespace-nowrap tabular-nums"
                                aria-label={`${c.view_count?.toLocaleString() ?? "unknown"} views`}
                              >
                                {c.view_count?.toLocaleString() ?? "?"} views
                              </span>
                            </div>
                            <span
                              className="flex h-5 shrink-0 items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                              >
                                <HugeiconsIcon
                                  icon={LinkSquare01Icon}
                                  strokeWidth={2}
                                />
                                YouTube
                              </a>
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
              {selecting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner />
                  Saving pick&hellip;
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </section>
  )
}
