import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ApiIcon,
  AudioWave02Icon,
  GlobeIcon,
  MusicNote01Icon,
  MusicNote02Icon,
  Scissor01Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettingsCache,
  saveAppSettingsCache,
  type AppSettings,
} from "@/lib/appSettings"
import {
  DEFAULT_PROJECT_DEFAULTS,
  loadProjectDefaults,
  saveProjectDefaults,
} from "@/lib/projectDefaults"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  FieldDescription,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { NAV } from "@/lib/nav"
import { cn } from "@/lib/utils"

const CLIP_PRESETS = [5, 10, 15, 20, 30] as const

const METADATA_PROVIDERS = [
  {
    value: "anilist" as const,
    label: "AniList",
    desc: "Better search and artwork. Jikan is used automatically as a fallback for theme song lists.",
    icon: GlobeIcon,
  },
  {
    value: "jikan" as const,
    label: "Jikan (MyAnimeList)",
    desc: "Direct MyAnimeList access. AniList is used automatically as a fallback.",
    icon: ApiIcon,
  },
]

const ENCODER_OPTIONS = [
  { value: "auto", label: "Auto", desc: "Let the app decide" },
  { value: "libx264", label: "H.264", desc: "Software, reliable" },
  { value: "h264_nvenc", label: "NVENC H.264", desc: "GPU accelerated" },
  { value: "hevc_nvenc", label: "NVENC HEVC", desc: "GPU, smaller files" },
] as const

export default function SettingsPage() {
  const [defaults, setDefaults] = useState(loadProjectDefaults)
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettingsCache)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [clipCustom, setClipCustom] = useState(
    !(CLIP_PRESETS as readonly number[]).includes(loadProjectDefaults().clipTime)
  )

  useEffect(() => {
    let cancelled = false
    api
      .getSettings()
      .then((remote) => {
        if (cancelled) return
        const next: AppSettings = {
          animeMetadataProvider: remote.anime_metadata_provider,
        }
        setAppSettings(next)
        saveAppSettingsCache(next)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load server settings")
        }
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const saveDefaults = () => {
    if (defaults.songTypes.length === 0) {
      toast.error("Select at least one song type")
      return
    }
    saveProjectDefaults(defaults)
    toast.success("Defaults saved")
  }

  const resetDefaults = () => {
    const reset = DEFAULT_PROJECT_DEFAULTS
    setDefaults(reset)
    setClipCustom(false)
    saveProjectDefaults(reset)
    toast.info("Defaults reset")
  }

  const saveAppSettings = async () => {
    try {
      const remote = await api.updateSettings({
        anime_metadata_provider: appSettings.animeMetadataProvider,
      })
      const next: AppSettings = {
        animeMetadataProvider: remote.anime_metadata_provider,
      }
      setAppSettings(next)
      saveAppSettingsCache(next)
      toast.success("Metadata settings saved")
    } catch {
      toast.error("Could not save metadata settings")
    }
  }

  const resetAppSettings = () => {
    setAppSettings(DEFAULT_APP_SETTINGS)
  }

  const toggleSongType = (type: string) => {
    setDefaults((prev) => ({
      ...prev,
      songTypes: prev.songTypes.includes(type)
        ? prev.songTypes.filter((t) => t !== type)
        : [...prev.songTypes, type],
    }))
  }

  return (
    <div className="flex flex-1 flex-col gap-10">
      <PageHeader
        title={NAV.settings}
        description="Defaults for new compilations and anime metadata sources."
      />

      <div className="flex flex-col gap-12 max-w-2xl">
        {/* ── Metadata provider ─────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              1
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Anime metadata
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground -mt-2 ml-10">
            Choose which API to use first when searching anime and loading artwork.
            The other provider kicks in automatically if the primary one fails.
            Opening and ending themes always come from Jikan.
          </p>

          <div className="grid grid-cols-2 gap-4 ml-10">
            {METADATA_PROVIDERS.map((provider) => {
              const selected = appSettings.animeMetadataProvider === provider.value
              return (
                <button
                  key={provider.value}
                  type="button"
                  onClick={() =>
                    setAppSettings((cur) => ({
                      ...cur,
                      animeMetadataProvider: provider.value,
                    }))
                  }
                  disabled={settingsLoading}
                  aria-label={`Select ${provider.label}`}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:opacity-50 disabled:pointer-events-none",
                    selected
                      ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border/70 bg-card/40 hover:border-primary/35 hover:bg-primary/[0.04] hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-lg transition-colors",
                    selected
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  )}>
                    <HugeiconsIcon icon={provider.icon} strokeWidth={1.5} className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{provider.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {provider.desc}
                    </p>
                  </div>
                  <div className={cn(
                    "mt-1 self-end rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {selected ? "Active" : "Select"}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2 ml-10">
            <Button onClick={saveAppSettings} disabled={settingsLoading}>
              Save metadata
            </Button>
            <Button
              variant="outline"
              onClick={resetAppSettings}
              disabled={settingsLoading}
            >
              Reset
            </Button>
          </div>
        </section>

        <Separator />

        {/* ── Compilation defaults ─────────────────────────── */}
        <section className="flex flex-col gap-8">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              2
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              New compilation defaults
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground -mt-4 ml-10">
            These values prefill when you start a new compilation. Saved in this
            browser.
          </p>

          <div className="flex flex-col gap-8 ml-10">
            {/* ── Song types ──────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Song types</span>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  role="switch"
                  aria-checked={defaults.songTypes.includes("opening")}
                  aria-label="Include openings"
                  onClick={() => toggleSongType("opening")}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    defaults.songTypes.includes("opening")
                      ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border/70 bg-card/40 hover:border-primary/35 hover:bg-primary/[0.04] hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-lg transition-colors",
                    defaults.songTypes.includes("opening")
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  )}>
                    <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={1.5} className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Openings</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      High-energy intro themes with iconic visuals.
                    </p>
                  </div>
                  <div className={cn(
                    "mt-1 self-end rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                    defaults.songTypes.includes("opening")
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {defaults.songTypes.includes("opening") ? "On" : "Off"}
                  </div>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={defaults.songTypes.includes("ending")}
                  aria-label="Include endings"
                  onClick={() => toggleSongType("ending")}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-5 text-left transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    defaults.songTypes.includes("ending")
                      ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border/70 bg-card/40 hover:border-primary/35 hover:bg-primary/[0.04] hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-lg transition-colors",
                    defaults.songTypes.includes("ending")
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  )}>
                    <HugeiconsIcon icon={MusicNote02Icon} strokeWidth={1.5} className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Endings</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Calmer ending themes, often with unique art styles.
                    </p>
                  </div>
                  <div className={cn(
                    "mt-1 self-end rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
                    defaults.songTypes.includes("ending")
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {defaults.songTypes.includes("ending") ? "On" : "Off"}
                  </div>
                </button>
              </div>
            </div>

            {/* ── Songs count stepper ──────────────────── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={MusicNote02Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Target songs</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-lg"
                  disabled={defaults.songsCount <= 1}
                  aria-label="Fewer songs"
                  onClick={() =>
                    setDefaults((c) => ({
                      ...c,
                      songsCount: Math.max(1, c.songsCount - 1),
                    }))
                  }
                >
                  <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-4" />
                </Button>
                <div className="flex size-14 items-center justify-center rounded-lg border border-border/60 bg-card/30 tabular-nums text-xl font-semibold">
                  {defaults.songsCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-lg"
                  disabled={defaults.songsCount >= 50}
                  aria-label="More songs"
                  onClick={() =>
                    setDefaults((c) => ({
                      ...c,
                      songsCount: Math.min(50, c.songsCount + 1),
                    }))
                  }
                >
                  <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
                </Button>
              </div>
              <FieldDescription>
                Total songs to include in each new compilation.
              </FieldDescription>
            </div>

            {/* ── Clip length preset chips ─────────────── */}
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
                      setDefaults((c) => ({ ...c, clipTime: preset }))
                      setClipCustom(false)
                    }}
                    aria-label={`${preset} seconds`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      defaults.clipTime === preset && !clipCustom
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
                    value={defaults.clipTime}
                    onChange={(e) =>
                      setDefaults((c) => ({
                        ...c,
                        clipTime: Number(e.target.value),
                      }))
                    }
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

            {/* ── Encoder card grid ───────────────────── */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Encoder</span>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {ENCODER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-label={`Select ${opt.label} encoder`}
                    onClick={() =>
                      setDefaults((c) => ({ ...c, encoder: opt.value }))
                    }
                    className={cn(
                      "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      defaults.encoder === opt.value
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

            {/* ── Audio normalize card toggle ─────────── */}
            <button
              type="button"
              role="switch"
              aria-checked={defaults.audioNormalize}
              aria-label="Toggle audio normalization"
              onClick={() =>
                setDefaults((c) => ({
                  ...c,
                  audioNormalize: !c.audioNormalize,
                }))
              }
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 max-w-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                defaults.audioNormalize
                  ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
                  : "border-border/70 bg-card/40 hover:border-border hover:bg-card/60"
              )}
            >
              <div className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                defaults.audioNormalize
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
                defaults.audioNormalize
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {defaults.audioNormalize ? "On" : "Off"}
              </div>
            </button>
          </div>

          <div className="flex gap-2 ml-10">
            <Button onClick={saveDefaults}>Save defaults</Button>
            <Button variant="outline" onClick={resetDefaults}>
              Reset defaults
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}