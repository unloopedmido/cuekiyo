import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  AudioWave02Icon,
  MinusSignIcon,
  MusicNote01Icon,
  MusicNote02Icon,
  PlusSignIcon,
  Scissor01Icon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { errorToMessage } from "@/lib/errors"
import { mergeOverlayConfig } from "@/lib/overlay-config"
import type { OverlayConfig, Project } from "@/types"
import { OverlaySettings } from "@/components/overlay-settings"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const CLIP_PRESETS = [5, 10, 15, 20, 30] as const

type ProjectEditPanelProps = {
  project: Project
  onSaved: (project: Project) => void
}

function projectFormState(project: Project) {
  return {
    title: project.title,
    songTypes: [...project.song_types],
    songsCount: project.songs_count,
    clipTime: project.clip_time,
    encoder: project.encoder,
    sourceMode: project.source_mode,
    audioNorm: project.audio_normalize,
    overlayConfig: mergeOverlayConfig(project.overlay_config),
  }
}

export function ProjectEditPanel({ project, onSaved }: ProjectEditPanelProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [songTypes, setSongTypes] = useState<string[]>(project.song_types)
  const [songsCount, setSongsCount] = useState(project.songs_count)
  const [clipTime, setClipTime] = useState(project.clip_time)
  const [clipCustom, setClipCustom] = useState(
    !(CLIP_PRESETS as readonly number[]).includes(project.clip_time)
  )
  const [encoder, setEncoder] = useState(project.encoder)
  const [sourceMode, setSourceMode] = useState<"auto" | "manual">(
    project.source_mode
  )
  const [audioNorm, setAudioNorm] = useState(project.audio_normalize)
  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(
    mergeOverlayConfig(project.overlay_config)
  )

  useEffect(() => {
    const next = projectFormState(project)
    setTitle(next.title)
    setSongTypes(next.songTypes)
    setSongsCount(next.songsCount)
    setClipTime(next.clipTime)
    setClipCustom(!(CLIP_PRESETS as readonly number[]).includes(next.clipTime))
    setEncoder(next.encoder)
    setSourceMode(next.sourceMode)
    setAudioNorm(next.audioNorm)
    setOverlayConfig(next.overlayConfig)
  }, [project.id, project.updated_at])

  const baseline = projectFormState(project)
  const dirty =
    title.trim() !== baseline.title ||
    songsCount !== baseline.songsCount ||
    clipTime !== baseline.clipTime ||
    encoder !== baseline.encoder ||
    sourceMode !== baseline.sourceMode ||
    audioNorm !== baseline.audioNorm ||
    songTypes.length !== baseline.songTypes.length ||
    songTypes.some((t, i) => t !== baseline.songTypes[i]) ||
    JSON.stringify(overlayConfig) !== JSON.stringify(baseline.overlayConfig)

  const toggleSongType = (type: string) => {
    setSongTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const save = async () => {
    if (!title.trim()) {
      toast.error("Add a title for your compilation.")
      return
    }
    if (songTypes.length === 0) {
      toast.error("Pick at least one song type.")
      return
    }
    setSaving(true)
    try {
      const updated = await api.patchProject(project.id, {
        title: title.trim(),
        songs_count: songsCount,
        song_types: songTypes,
        clip_time: clipTime,
        encoder,
        audio_normalize: audioNorm,
        source_mode: sourceMode,
        overlay_config: overlayConfig,
      })
      onSaved(updated)
      toast.success("Project settings saved")
    } catch (e) {
      toast.error(errorToMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/70 bg-card/25 fcr-glass"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
            "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            open && "border-b border-border/60"
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <HugeiconsIcon icon={Scissor01Icon} strokeWidth={1.5} className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Project settings</span>
            <span className="block truncate text-xs text-muted-foreground">
              Title, clip length, overlay, and sourcing options
            </span>
          </span>
          {dirty ? (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Unsaved
            </span>
          ) : null}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="flex flex-col gap-6 px-4 pb-4 pt-3 fcr-animate-up">
        <Field>
          <FieldLabel htmlFor="edit-project-title">Title</FieldLabel>
          <Input
            id="edit-project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Compilation title"
            className="max-w-xl"
          />
        </Field>

        <div className="flex flex-col gap-3 max-w-xl">
          <span className="text-sm font-medium">Song types</span>
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: "opening", label: "Openings", icon: MusicNote01Icon },
              { type: "ending", label: "Endings", icon: MusicNote02Icon },
            ] as const).map(({ type, label, icon }) => {
              const selected = songTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  role="switch"
                  aria-checked={selected}
                  aria-label={`Include ${label.toLowerCase()}`}
                  onClick={() => toggleSongType(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                    selected
                      ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50"
                  )}
                >
                  <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 max-w-xl">
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
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                  clipTime === preset && !clipCustom
                    ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 text-primary"
                    : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50"
                )}
              >
                {preset}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => setClipCustom(true)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                clipCustom
                  ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 text-primary"
                  : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50"
              )}
            >
              Custom
            </button>
          </div>
          {clipCustom && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={3}
                max={120}
                value={clipTime}
                onChange={(e) => setClipTime(Number(e.target.value))}
                className="h-9 w-20 text-center tabular-nums"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 max-w-xl">
          <span className="text-sm font-medium">Clip sources</span>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "auto" as const, label: "Find clips for me", desc: "Search YouTube per song" },
              { value: "manual" as const, label: "Paste YouTube links", desc: "You pick each video" },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={sourceMode === opt.value}
                onClick={() => setSourceMode(opt.value)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                  sourceMode === opt.value
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

        <div className="flex flex-col gap-3 max-w-xl">
          <span className="text-sm font-medium">Target songs</span>
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
            Total songs to include in this compilation.
          </FieldDescription>
        </div>

        <div className="flex flex-col gap-3 max-w-xl">
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
                  "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all",
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

        <OverlaySettings config={overlayConfig} onChange={setOverlayConfig} />

        <button
          type="button"
          role="switch"
          aria-checked={audioNorm}
          aria-label="Toggle audio normalization"
          onClick={() => setAudioNorm(!audioNorm)}
          className={cn(
            "flex max-w-sm items-center gap-4 rounded-xl border p-4 text-left transition-all",
            audioNorm
              ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
              : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60"
          )}
        >
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              audioNorm ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={AudioWave02Icon} strokeWidth={1.5} className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold">Normalize audio</p>
            <p className="text-xs text-muted-foreground">
              Balance loudness across clips for consistent playback.
            </p>
          </div>
          <div
            className={cn(
              "ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
              audioNorm ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {audioNorm ? "On" : "Off"}
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <Button
            type="button"
            disabled={!dirty || saving || !title.trim() || songTypes.length === 0}
            onClick={() => void save()}
          >
            {saving && <LoadingSpinner data-icon="inline-start" />}
            Save settings
          </Button>
          {dirty ? (
            <p className="text-xs text-muted-foreground">
              Changes apply to the next pipeline stages.
            </p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
