import { useEffect, useRef, useState, useCallback } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Image01Icon,
  Loading03Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { errorToMessage } from "@/lib/errors"
import { mergeOverlayConfig, rgbaWhiteOpacity, whiteRgba } from "@/lib/overlay-config"
import type { OverlayConfig, Project } from "@/types"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const STYLE_OPTIONS = [
  { value: "default" as const, label: "Default", desc: "Full lower-third card with gradient bar" },
  { value: "minimal" as const, label: "Minimal", desc: "Compact text, lighter chrome" },
] as const

const POSITION_OPTIONS = [
  { value: "bottom" as const, label: "Bottom", desc: "Standard lower-third placement" },
  { value: "top" as const, label: "Top", desc: "Upper edge of the frame" },
] as const

const FONT_SCALE_OPTIONS = [
  { value: "compact" as const, label: "Compact", desc: "Smaller type for dense overlays" },
  { value: "default" as const, label: "Default", desc: "Balanced sizing for 1080p clips" },
  { value: "large" as const, label: "Large", desc: "Bigger titles and metadata" },
] as const

const SHOW_OPTIONS = [
  { key: "show_anime_name" as const, label: "Anime name", desc: "Show title on each clip" },
  { key: "show_song_line" as const, label: "Song line", desc: "OP/ED number and song title" },
  { key: "show_meta_line" as const, label: "Source details", desc: "Views and uploader from YouTube" },
] as const

type PreviewSample = {
  animeName: string
  songLine: string
  metaLine: string
}

export function OverlayConfigEditor({
  projectId,
  project,
  onDone,
}: {
  projectId: string
  project: Project
  onDone: () => void
}) {
  const [config, setConfig] = useState<OverlayConfig>(() =>
    mergeOverlayConfig(project.overlay_config)
  )
  const [sample, setSample] = useState<PreviewSample>({
    animeName: project.animes[0]?.anime_name ?? "Sample Anime",
    songLine: "OP1: Brave Shine",
    metaLine: "12,345 views · Sample Channel",
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewRequest = useRef(0)

  const persistConfig = (next: OverlayConfig) => {
    setConfig(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaving(true)
      api
        .patchProject(projectId, { overlay_config: next })
        .catch((e) => toast.error(errorToMessage(e)))
        .finally(() => setSaving(false))
    }, 400)
  }

  const update = (partial: Partial<OverlayConfig>) => {
    persistConfig(mergeOverlayConfig({ ...config, ...partial }))
  }

  const runPreview = useCallback(async () => {
    const requestId = ++previewRequest.current
    setPreviewing(true)
    try {
      const { png_base64 } = await api.previewOverlay({
        width: 1280,
        height: 720,
        anime_name: sample.animeName,
        song_line: sample.songLine,
        meta_line: sample.metaLine,
        config,
      })
      if (requestId !== previewRequest.current) return
      setPreviewUrl(`data:image/png;base64,${png_base64}`)
    } catch (e) {
      if (requestId === previewRequest.current) {
        toast.error(errorToMessage(e))
      }
    }
    if (requestId === previewRequest.current) {
      setPreviewing(false)
    }
  }, [config, sample.animeName, sample.songLine, sample.metaLine])

  useEffect(() => {
    if (!config.enabled) {
      return
    }
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => {
      void runPreview()
    }, 450)
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current)
    }
  }, [config, sample.animeName, sample.songLine, sample.metaLine, runPreview])

  const displayPreviewUrl = config.enabled ? previewUrl : null

  const confirm = async () => {
    setConfirming(true)
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      await api.patchProject(projectId, { overlay_config: config })
      await api.confirmOverlayConfig(projectId)
      toast.success(
        config.enabled ? "Applying overlay to clips" : "Skipping overlay, continuing"
      )
      onDone()
    } catch (e) {
      toast.error(errorToMessage(e))
    }
    setConfirming(false)
  }

  return (
    <div className="flex flex-col gap-8 fcr-animate-up">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Customize overlay
          </h2>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Clips are trimmed and ready. Choose how lower-thirds appear on each segment,
          preview with sample text, then continue to arrange the final order.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <FieldGroup className="gap-8">
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            aria-label="Toggle lower-third overlay"
            onClick={() => update({ enabled: !config.enabled })}
            className={cn(
              "flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              config.enabled
                ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60",
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                config.enabled
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/60 text-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={Image01Icon} strokeWidth={1.5} className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold">Show overlay on clips</p>
              <p className="text-xs text-muted-foreground">
                Turn off to export clean clips with no text burned in.
              </p>
            </div>
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                config.enabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {config.enabled ? "On" : "Off"}
            </span>
          </button>

          <fieldset
            disabled={!config.enabled}
            className="flex flex-col gap-8 disabled:opacity-50"
          >
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Style</span>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ style: opt.value })}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      config.style === opt.value
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                        : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50",
                    )}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] leading-relaxed text-muted-foreground">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Position</span>
              <div className="grid grid-cols-2 gap-2">
                {POSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ position: opt.value })}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      config.position === opt.value
                        ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                        : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50",
                    )}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] leading-relaxed text-muted-foreground">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Colors & typography</span>
                <FieldDescription>
                  Accent bar, text colors, and type size. Preview updates as you change settings.
                </FieldDescription>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="overlay-accent">Accent</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      id="overlay-accent"
                      type="color"
                      value={config.accent_color}
                      onChange={(e) => update({ accent_color: e.target.value })}
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5"
                    />
                    <Input
                      value={config.accent_color}
                      onChange={(e) => update({ accent_color: e.target.value })}
                      aria-label="Accent color hex"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="overlay-title">Title</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      id="overlay-title"
                      type="color"
                      value={config.title_color}
                      onChange={(e) => update({ title_color: e.target.value })}
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5"
                    />
                    <Input
                      value={config.title_color}
                      onChange={(e) => update({ title_color: e.target.value })}
                      aria-label="Title color hex"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="overlay-subtitle-opacity">
                    Subtitle opacity
                  </FieldLabel>
                  <input
                    id="overlay-subtitle-opacity"
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={rgbaWhiteOpacity(config.subtitle_color)}
                    onChange={(e) =>
                      update({
                        subtitle_color: whiteRgba(Number.parseFloat(e.target.value)),
                      })
                    }
                    className="w-full accent-primary"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="overlay-meta-opacity">Meta opacity</FieldLabel>
                  <input
                    id="overlay-meta-opacity"
                    type="range"
                    min={0.35}
                    max={0.9}
                    step={0.01}
                    value={rgbaWhiteOpacity(config.meta_color)}
                    onChange={(e) =>
                      update({
                        meta_color: whiteRgba(Number.parseFloat(e.target.value)),
                      })
                    }
                    className="w-full accent-primary"
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">Type size</span>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_SCALE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ font_scale: opt.value })}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        config.font_scale === opt.value
                          ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                          : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50",
                      )}
                    >
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[10px] leading-relaxed text-muted-foreground">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Visible lines</span>
              <div className="flex flex-col gap-2">
                {SHOW_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      config[opt.key]
                        ? "border-primary/30 bg-primary/[0.04]"
                        : "border-border/60 bg-card/20 hover:bg-card/40",
                    )}
                  >
                    <Checkbox
                      checked={config[opt.key]}
                      onCheckedChange={(checked) =>
                        update({ [opt.key]: checked === true })
                      }
                      aria-label={opt.label}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-sm font-medium">Preview sample text</span>
              <Field>
                <FieldLabel htmlFor="overlay-sample-anime">Anime name</FieldLabel>
                <Input
                  id="overlay-sample-anime"
                  value={sample.animeName}
                  onChange={(e) => {
                    setSample((s) => ({ ...s, animeName: e.target.value }))
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="overlay-sample-song">Song line</FieldLabel>
                <Input
                  id="overlay-sample-song"
                  value={sample.songLine}
                  onChange={(e) => {
                    setSample((s) => ({ ...s, songLine: e.target.value }))
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="overlay-sample-meta">Source details</FieldLabel>
                <Input
                  id="overlay-sample-meta"
                  value={sample.metaLine}
                  onChange={(e) => {
                    setSample((s) => ({ ...s, metaLine: e.target.value }))
                  }}
                />
              </Field>
              <FieldDescription>
                Preview uses this text. Final render uses each song&apos;s actual metadata.
              </FieldDescription>
            </div>
          </fieldset>
        </FieldGroup>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void runPreview()}
              disabled={previewing || !config.enabled}
            >
              {previewing ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <HugeiconsIcon
                  icon={Image01Icon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              {previewing ? "Updating…" : "Refresh preview"}
            </Button>
            {saving ? (
              <span className="text-xs text-muted-foreground">Saving…</span>
            ) : null}
            {previewing && displayPreviewUrl ? (
              <span className="text-xs text-muted-foreground">Updating preview…</span>
            ) : null}
          </div>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background/90 fcr-glass">
            {displayPreviewUrl ? (
              <img
                src={displayPreviewUrl}
                alt="Overlay preview on a sample 16:9 frame"
                className="aspect-video w-full object-contain"
              />
            ) : previewing ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-8 animate-spin text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">Generating preview…</p>
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center">
                <HugeiconsIcon
                  icon={ViewIcon}
                  strokeWidth={1.5}
                  className="size-8 text-muted-foreground/50"
                />
                <p className="text-sm text-muted-foreground">
                  {config.enabled
                    ? "Preview loads automatically when you change settings."
                    : "Overlay is off. Clips will export without lower-thirds."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-6">
        <Button
          type="button"
          size="lg"
          className="w-full max-w-md"
          disabled={confirming}
          onClick={() => void confirm()}
        >
          {confirming && <LoadingSpinner data-icon="inline-start" />}
          {config.enabled ? "Apply overlay and continue" : "Continue without overlay"}
        </Button>
        <FieldDescription>
          {config.enabled
            ? "Lower-thirds will be burned onto each clip, then you can set render order."
            : "Clean clips will be used as-is for the final video."}
        </FieldDescription>
      </div>
    </div>
  )
}
