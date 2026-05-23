import { useActionState, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  AudioWave02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  MinusSignIcon,
  MusicNote01Icon,
  MusicNote02Icon,
  PlusSignIcon,
  Scissor01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { errorToMessage } from "@/lib/errors"
import { loadProjectDefaults } from "@/lib/projectDefaults"
import { PageHeader } from "@/components/page-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { NAV } from "@/lib/nav"

type AnimePick = {
  mal_id: number
  title: string
  title_english?: string
  image_url?: string
  year?: number
}

const CLIP_PRESETS = [5, 10, 15, 20, 30] as const

export default function ProjectSetup() {
  const nav = useNavigate()
  const [title, setTitle] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AnimePick[]>([])
  const [animes, setAnimes] = useState<AnimePick[]>([])
  const [initialDefaults] = useState(loadProjectDefaults)
  const [songTypes, setSongTypes] = useState(initialDefaults.songTypes)
  const [songsCount, setSongsCount] = useState(initialDefaults.songsCount)
  const [clipTime, setClipTime] = useState(initialDefaults.clipTime)
  const [clipCustom, setClipCustom] = useState(false)
  const [encoder, setEncoder] = useState(initialDefaults.encoder)
  const [audioNorm, setAudioNorm] = useState(initialDefaults.audioNormalize)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touchedTitle, setTouchedTitle] = useState(false)
  const [touchedAnimes, setTouchedAnimes] = useState(false)
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const titleError = !title.trim() && (touchedTitle || triedSubmit)
  const animeError = animes.length === 0 && (touchedAnimes || triedSubmit)
  const titleDescribedBy = titleError ? "title-error" : undefined
  const animeDescribedBy = [
    "anime-hint",
    hasSearched && results.length === 0 ? "anime-no-results" : null,
    animeError ? "anime-error" : null,
  ]
    .filter(Boolean)
    .join(" ")

  const clipIsPreset = (CLIP_PRESETS as readonly number[]).includes(clipTime)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      return
    }
    let cancelled = false
    const handle = setTimeout(() => {
      setError(null)
      setSearching(true)
      api
        .searchAnime(q)
        .then((data) => {
          if (!cancelled) {
            setResults(data)
            setHasSearched(true)
          }
        })
        .catch((e) => {
          if (!cancelled) setError(errorToMessage(e))
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query])

  const search = () => {
    if (query.trim().length < 2) return
    setError(null)
    setSearching(true)
    api
      .searchAnime(query.trim())
      .then((data) => {
        setResults(data)
        setHasSearched(true)
      })
      .catch((e) => setError(errorToMessage(e)))
      .finally(() => setSearching(false))
  }

  const addAnime = (result: AnimePick) => {
    if (!animes.some((a) => a.mal_id === result.mal_id)) {
      setAnimes([...animes, result])
    }
  }

  const removeAnime = (malId: number) => {
    setAnimes(animes.filter((a) => a.mal_id !== malId))
  }

  const toggleSongType = (type: string) => {
    setSongTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const [submitError, submit, submitting] = useActionState(
    async (previousError: string | null, formData: FormData) => {
      void previousError
      void formData
      if (!title.trim() || animes.length === 0 || songTypes.length === 0) {
        setTriedSubmit(true)
        return null
      }
      setError(null)
      try {
        const project = await api.createProject({
          title: title.trim(),
          animes: animes.map((anime, index) => ({
            anime_mal_id: anime.mal_id,
            anime_name: anime.title,
            display_order: index,
            image_url: anime.image_url ?? null,
          })),
          songs_count: songsCount,
          song_types: songTypes,
          clip_time: clipTime,
          encoder,
          audio_normalize: audioNorm,
        })
        await api.loadThemes(project.id)
        toast.success("Compilation started")
        nav(`/projects/${project.id}`)
        return null
      } catch (e) {
        const msg = errorToMessage(e)
        toast.error(msg)
        return msg
      }
    },
    null
  )

  return (
    <div className="flex flex-1 flex-col gap-10">
      <PageHeader
        title={NAV.newCompilation}
        description="Set up your anime MV compilation in a few steps. Name it, pick shows, choose song types, and go."
      />

      <form
        action={submit}
        className="flex flex-col gap-12"
      >
        {/* ── Step 1: Title ──────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              1
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Name your compilation
            </h2>
          </div>

          <Field data-invalid={titleError || undefined}>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouchedTitle(true)}
              placeholder='e.g. "Winter 2024 Openings"'
              aria-invalid={titleError}
              aria-describedby={titleDescribedBy}
              className="h-12 max-w-xl text-base placeholder:text-base"
            />
            {titleError && (
              <FieldDescription id="title-error" className="text-destructive">
                Add a title for your compilation.
              </FieldDescription>
            )}
          </Field>
        </section>

        <Separator />

        {/* ── Step 2: Anime ─────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              2
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Add anime
            </h2>
          </div>

          <Field data-invalid={animeError || undefined}>
            <InputGroup className="h-11 max-w-xl">
              <InputGroupAddon align="inline-start">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              </InputGroupAddon>
              <InputGroupInput
                id="anime-search"
                value={query}
                onChange={(e) => {
                  const nextQuery = e.target.value
                  setQuery(nextQuery)
                  setHasSearched(false)
                  if (nextQuery.trim().length < 2) {
                    setResults([])
                  }
                }}
                onBlur={() => setTouchedAnimes(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void search()
                  }
                }}
                placeholder="Search by title, e.g. Attack on Titan"
                aria-invalid={animeError}
                aria-describedby={animeDescribedBy}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => void search()}
                  disabled={searching}
                >
                  {searching ? "Searching\u2026" : "Search"}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription id="anime-hint">
              Results appear as you type. Click to add, click again to remove.
            </FieldDescription>
            {hasSearched && results.length === 0 && (
              <FieldDescription id="anime-no-results">
                No results found. Try a different title.
              </FieldDescription>
            )}
            {animeError && (
              <FieldDescription id="anime-error" className="text-destructive">
                Add at least one anime to continue.
              </FieldDescription>
            )}
          </Field>

          {/* Search results grid */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.slice(0, 5).map((result) => {
                const isAdded = animes.some((a) => a.mal_id === result.mal_id)
                return (
                  <button
                    key={result.mal_id}
                    type="button"
                    aria-label={isAdded ? `Remove ${result.title_english || result.title}` : `Add ${result.title_english || result.title}`}
                    onClick={() => isAdded ? removeAnime(result.mal_id) : addAnime(result)}
                    className={cn(
                      "group/result relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isAdded
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 cursor-pointer hover:opacity-80"
                        : "border-border/70 bg-card/40 hover:border-primary/35 hover:bg-primary/[0.04] hover:-translate-y-0.5 cursor-pointer active:translate-y-0"
                    )}
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                      {result.image_url ? (
                        <img
                          src={result.image_url}
                          alt=""
                          className={cn(
                            "h-full w-full object-cover transition-all duration-300",
                            isAdded ? "group-hover/result:scale-100" : "group-hover/result:scale-105"
                          )}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <HugeiconsIcon
                            icon={Add01Icon}
                            strokeWidth={1.5}
                            className="size-8 text-muted-foreground/40"
                          />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                      {/* Unselected: hover shows Add pill */}
                      {!isAdded && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover/result:opacity-100">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5" />
                            Add
                          </span>
                        </div>
                      )}
                      {/* Selected: checkmark badge (always visible), hover shows Remove */}
                      {isAdded && (
                        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover/result:opacity-100">
                            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                            Remove
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2.5">
                        <p className="truncate text-xs font-semibold text-white leading-tight drop-shadow-sm">
                          {result.title_english || result.title}
                        </p>
                        {result.year && (
                          <p className="mt-0.5 text-[10px] text-white/70 tabular-nums">
                            {result.year}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <Separator />

        {/* ── Step 3: Song types ────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              3
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Pick song types
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <button
              type="button"
              role="switch"
              aria-checked={songTypes.includes("opening")}
              aria-label="Include openings"
              onClick={() => toggleSongType("opening")}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                songTypes.includes("opening")
                  ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                  : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60"
              )}
            >
              <div className={cn(
                "flex size-10 items-center justify-center rounded-lg transition-colors",
                songTypes.includes("opening")
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/60 text-muted-foreground"
              )}>
                <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={1.5} className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Openings</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  High-energy intro themes with iconic visuals. The most popular pick for compilations.
                </p>
              </div>
              <div className={cn(
                "mt-1 self-end rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                songTypes.includes("opening")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {songTypes.includes("opening") ? "Selected" : "Select"}
              </div>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={songTypes.includes("ending")}
              aria-label="Include endings"
              onClick={() => toggleSongType("ending")}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                songTypes.includes("ending")
                  ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                  : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60"
              )}
            >
              <div className={cn(
                "flex size-10 items-center justify-center rounded-lg transition-colors",
                songTypes.includes("ending")
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/60 text-muted-foreground"
              )}>
                <HugeiconsIcon icon={MusicNote02Icon} strokeWidth={1.5} className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Endings</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Calmer ending themes, often with unique art styles. Great for variety.
                </p>
              </div>
              <div className={cn(
                "mt-1 self-end rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                songTypes.includes("ending")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {songTypes.includes("ending") ? "Selected" : "Select"}
              </div>
            </button>
          </div>

          {triedSubmit && songTypes.length === 0 && (
            <FieldDescription className="text-destructive">
              Pick at least one song type.
            </FieldDescription>
          )}
        </section>

        <Separator />

        {/* ── Step 4: Settings ──────────────────────────────── */}
        <section className="flex flex-col gap-8">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              4
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Adjust settings
            </h2>
          </div>

          <div className="flex flex-col gap-8 max-w-xl">
            {/* Clip length — preset chips */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Scissor01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Clip length</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {CLIP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setClipTime(preset)
                      setClipCustom(false)
                    }}
                    aria-label={`${preset} seconds`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      clipTime === preset && !clipCustom
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 text-primary"
                        : "border-border/60 bg-card/30 text-foreground hover:border-border hover:bg-card/50"
                    )}
                  >
                    {preset}s
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setClipCustom(true)}
                  aria-label="Custom clip length"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    clipCustom
                      ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 text-primary"
                      : "border-border/60 bg-card/30 text-foreground hover:border-border hover:bg-card/50"
                  )}
                >
                  Custom
                </button>
              </div>
              {clipCustom && (
                <div className="flex items-center gap-2">
                  <Input
                    id="clip-time"
                    type="number"
                    min={3}
                    max={120}
                    value={clipTime}
                    onChange={(e) => setClipTime(Number(e.target.value))}
                    className="h-9 w-20 text-center tabular-nums"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
              )}
              <FieldDescription>
                How many seconds from each clip make it into the final video.
              </FieldDescription>
            </div>

            {/* Songs count — stepper */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Target songs</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-lg"
                  disabled={songsCount <= 1}
                  aria-label="Fewer songs"
                  onClick={() => setSongsCount(Math.max(1, songsCount - 1))}
                >
                  <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-4" />
                </Button>
                <div className="flex size-14 items-center justify-center rounded-lg border border-border/60 bg-card/30 tabular-nums text-xl font-semibold">
                  {songsCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-lg"
                  disabled={songsCount >= 50}
                  aria-label="More songs"
                  onClick={() => setSongsCount(Math.min(50, songsCount + 1))}
                >
                  <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
                </Button>
              </div>
              <FieldDescription>
                Total number of songs to include in this compilation.
              </FieldDescription>
            </div>

            {/* Encoder — card grid */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Encoder</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "auto", label: "Auto", desc: "Let the app decide" },
                  { value: "libx264", label: "H.264", desc: "Software, reliable" },
                  { value: "h264_nvenc", label: "NVENC H.264", desc: "GPU accelerated" },
                  { value: "hevc_nvenc", label: "NVENC HEVC", desc: "GPU, smaller files" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-label={`Select ${opt.label} encoder`}
                    onClick={() => setEncoder(opt.value)}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      encoder === opt.value
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                        : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50"
                    )}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio normalize — card toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={audioNorm}
              aria-label="Toggle audio normalization"
              onClick={() => setAudioNorm(!audioNorm)}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 max-w-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                audioNorm
                  ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                  : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60"
              )}
            >
              <div className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                audioNorm
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/60 text-muted-foreground"
              )}>
                <HugeiconsIcon icon={AudioWave02Icon} strokeWidth={1.5} className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">Normalize audio</p>
                <p className="text-xs text-muted-foreground">
                  Balance loudness across all clips for consistent playback.
                </p>
              </div>
              <div className={cn(
                "ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                audioNorm
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {audioNorm ? "On" : "Off"}
              </div>
            </button>
          </div>
        </section>

        {/* ── Submit ────────────────────────────────────────── */}
        {(error || submitError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || submitError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 max-w-xl">
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base"
            disabled={
              !title.trim() ||
              animes.length === 0 ||
              songTypes.length === 0 ||
              submitting
            }
          >
            {submitting && <LoadingSpinner data-icon="inline-start" />}
            Start compilation
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            The pipeline will search for themes, find video candidates, and walk you through each step.
          </p>
        </div>
      </form>
    </div>
  )
}
