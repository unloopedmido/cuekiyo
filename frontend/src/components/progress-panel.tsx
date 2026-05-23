import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  File01Icon,
  MusicNote01Icon,
  Scissor01Icon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { getStatusCopy } from "@/pipeline"
import { formatSongType } from "@/lib/nav"
import type { Job, ProgressEvent, Project, ProjectStatus, Song } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

function isFreshProgress(
  progress: ProgressEvent | null,
  projectStatus: ProjectStatus,
  latestJob: Job | null
): progress is ProgressEvent {
  if (!progress) return false
  if (progress.stage !== projectStatus) return false
  if (latestJob && progress.jobId !== latestJob.id) return false
  return true
}

function logLevelClass(level: string): string | undefined {
  if (level === "error") return "text-destructive"
  if (level === "warning") return "text-primary/80"
  return "text-muted-foreground"
}

const SONG_STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof MusicNote01Icon; tone: "idle" | "running" | "done" | "error" }
> = {
  pending: { label: "Queued", icon: MusicNote01Icon, tone: "idle" },
  sourcing: { label: "Sourcing", icon: MusicNote01Icon, tone: "running" },
  awaiting_selection: { label: "Awaiting selection", icon: MusicNote01Icon, tone: "idle" },
  selected: { label: "Selected", icon: CheckmarkCircle02Icon, tone: "done" },
  downloading: { label: "Downloading", icon: Download01Icon, tone: "running" },
  normalizing: { label: "Normalizing", icon: MusicNote01Icon, tone: "running" },
  cutting: { label: "Cutting", icon: Scissor01Icon, tone: "running" },
  overlaying: { label: "Overlaying", icon: MusicNote01Icon, tone: "running" },
  ready: { label: "Ready", icon: CheckmarkCircle02Icon, tone: "done" },
  failed: { label: "Failed", icon: Cancel01Icon, tone: "error" },
}

function songStatusKey(status: string): string {
  return SONG_STATUS_CONFIG[status] ? status : "pending"
}

type AnimeGroup = {
  animeMalId: number
  animeName: string
  imageUrl: string | null
  songs: Song[]
}

function groupSongsByAnime(songs: Song[], animes: Project["animes"]): AnimeGroup[] {
  const animeMap = new Map(animes.map((a) => [a.anime_mal_id, a]))
  const groups = new Map<number, AnimeGroup>()

  for (const song of songs) {
    let group = groups.get(song.anime_mal_id)
    if (!group) {
      const anime = animeMap.get(song.anime_mal_id)
      group = {
        animeMalId: song.anime_mal_id,
        animeName: song.anime_name,
        imageUrl: anime?.image_url ?? null,
        songs: [],
      }
      groups.set(song.anime_mal_id, group)
    }
    group.songs.push(song)
  }

  return Array.from(groups.values())
}

const STAGES_WITH_SONGS = new Set([
  "SOURCING",
  "AWAITING_CANDIDATES",
  "DOWNLOADING",
  "PROBING_NORMALIZING",
  "CUTTING",
  "OVERLAYING",
  "AWAITING_RENDER_ORDER",
  "RENDERING",
])

export function ProgressPanel({
  projectId,
  projectStatus,
  projectAnimes,
  progress,
  onCancel,
}: {
  projectId: string
  projectStatus: ProjectStatus
  projectAnimes: Project["animes"]
  progress: ProgressEvent | null
  onCancel: () => void
}) {
  const [logs, setLogs] = useState<
    { id: string; message: string; level: string }[]
  >([])
  const [logsOpen, setLogsOpen] = useState(false)
  const [latestJob, setLatestJob] = useState<Job | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const logEndRef = useRef<HTMLLIElement>(null)

  const showSongs = STAGES_WITH_SONGS.has(projectStatus) || projectStatus === "COMPLETED"

  useEffect(() => {
    const sync = () => {
      api.listJobs(projectId).then((jobs) => {
        const running = jobs.find((j) => j.status === "running")
        setLatestJob(running ?? jobs[0] ?? null)
      })
    }
    sync()
    const t = setInterval(sync, 3000)
    return () => clearInterval(t)
  }, [projectId, projectStatus, progress?.jobId])

  useEffect(() => {
    if (!showSongs) return
    const load = () => {
      api.listSongs(projectId).then(setSongs).catch(() => setSongs([]))
    }
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [projectId, showSongs, progress?.jobId])

  useEffect(() => {
    if (!logsOpen) return
    const load = () => {
      api
        .projectLogs(projectId)
        .then(setLogs)
        .catch(() => setLogs([]))
    }
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [logsOpen, projectId, progress?.jobId])

  useEffect(() => {
    if (!logsOpen || logs.length === 0) return
    logEndRef.current?.scrollIntoView({ block: "end" })
  }, [logs, logsOpen])

  const animeGroups = useMemo(
    () => groupSongsByAnime(songs, projectAnimes),
    [songs, projectAnimes]
  )

  const live = isFreshProgress(progress, projectStatus, latestJob)
  const pct = Math.round(live ? progress.progress : (latestJob?.progress ?? 0))
  const message = live ? progress.message : (latestJob?.current_step ?? "")
  const stage = getStatusCopy(projectStatus)

  // For LOADING_THEMES, show per-anime loading
  const loadingAnimes = projectStatus === "LOADING_THEMES"

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 md:p-6"
      aria-live="polite"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium tracking-wider text-primary uppercase">
            In progress
          </span>
          <h2 className="font-heading text-lg font-semibold">{stage.label}</h2>
          <p className="text-sm break-words text-muted-foreground">
            {message || <>{stage.label}&hellip;</>}
          </p>
        </div>
        <span className="shrink-0 font-heading text-2xl font-semibold text-primary tabular-nums">
          {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-2" aria-label={stage.label} />

      {/* ── Per-anime / per-song progress ───────────────────── */}
      {loadingAnimes && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Loading themes
          </p>
          <ul className="flex flex-col gap-1.5">
            {projectAnimes.map((anime, i) => (
              <li
                key={anime.anime_mal_id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
              >
                {anime.image_url ? (
                  <img
                    src={anime.image_url}
                    alt=""
                    className="size-8 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="size-8 rounded bg-muted/60" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {anime.anime_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {i === 0 ? "Loading…" : "Queued"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showSongs && animeGroups.length > 0 && (
        <div className="flex flex-col gap-4">
          {animeGroups.map((group) => {
            const done = group.songs.filter(
              (s) => s.status === "ready" || s.status === "selected"
            ).length
            const total = group.songs.length
            return (
              <div key={group.animeMalId} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  {group.imageUrl ? (
                    <img
                      src={group.imageUrl}
                      alt=""
                      className="size-7 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="size-7 rounded bg-muted/60" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {group.animeName}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {done}/{total}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {group.songs.map((song) => {
                    const cfg = SONG_STATUS_CONFIG[songStatusKey(song.status)]
                    const isRunning = cfg.tone === "running"
                    return (
                      <li
                        key={song.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                          isRunning
                            ? "border border-primary/25 bg-primary/[0.04]"
                            : "border border-transparent"
                        )}
                      >
                        <HugeiconsIcon
                          icon={cfg.icon}
                          strokeWidth={2}
                          className={cn(
                            "size-4 shrink-0",
                            cfg.tone === "done" && "text-primary",
                            cfg.tone === "running" && "text-primary animate-pulse",
                            cfg.tone === "error" && "text-destructive",
                            cfg.tone === "idle" && "text-muted-foreground"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{song.song_title}</span>
                          {song.artist && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {song.artist}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {cfg.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Actions & log ───────────────────────────────────── */}
      <Collapsible
        open={logsOpen}
        onOpenChange={setLogsOpen}
        className="flex w-full min-w-0 flex-col gap-3"
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Stop
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <HugeiconsIcon
                icon={File01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              {logsOpen ? "Hide log" : "View log"}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="w-full min-w-0 outline-none">
          <ScrollArea
            className="h-[min(11rem,28vh)] w-full min-w-0 rounded-lg border border-border/80 bg-background/90"
            aria-label="Project log"
          >
            <div className="p-3 font-mono text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">
                  Waiting for log output&hellip;
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {logs.map((l) => (
                    <li
                      key={l.id}
                      className={cn(
                        "break-words whitespace-pre-wrap",
                        logLevelClass(l.level)
                      )}
                    >
                      <span className="text-muted-foreground/80">
                        [{l.level}]
                      </span>{" "}
                      {l.message}
                    </li>
                  ))}
                  <li aria-hidden className="h-px" ref={logEndRef} />
                </ul>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
