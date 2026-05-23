import { useEffect, useState } from "react"
import { toast } from "sonner"
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { NAV } from "@/lib/nav"

export default function SettingsPage() {
  const [defaults, setDefaults] = useState(loadProjectDefaults)
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettingsCache)
  const [settingsLoading, setSettingsLoading] = useState(true)

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
    setDefaults(DEFAULT_PROJECT_DEFAULTS)
    saveProjectDefaults(DEFAULT_PROJECT_DEFAULTS)
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
      toast.success("Anime metadata settings saved")
    } catch {
      toast.error("Could not save anime metadata settings")
    }
  }

  const resetAppSettings = () => {
    setAppSettings(DEFAULT_APP_SETTINGS)
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader
        title={NAV.settings}
        description="Defaults for new compilations and anime metadata sources."
      />

      <div className="max-w-xl space-y-10">
        <FieldGroup className="gap-6">
          <div>
            <h2 className="text-sm font-medium">Anime metadata</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose which API to use first when searching anime and loading
              artwork. The other provider is used automatically if the primary
              one fails. Opening and ending themes still come from Jikan.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="anime-metadata-provider">
              Primary metadata API
            </FieldLabel>
            <Select
              value={appSettings.animeMetadataProvider}
              onValueChange={(provider: AppSettings["animeMetadataProvider"]) =>
                setAppSettings((current) => ({
                  ...current,
                  animeMetadataProvider: provider,
                }))
              }
              disabled={settingsLoading}
            >
              <SelectTrigger id="anime-metadata-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jikan">Jikan (MyAnimeList)</SelectItem>
                <SelectItem value="anilist">AniList</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              AniList is often more reliable for search and artwork. Jikan
              remains required for theme song lists.
            </FieldDescription>
          </Field>
          <div className="flex gap-2">
            <Button onClick={saveAppSettings} disabled={settingsLoading}>
              Save metadata settings
            </Button>
            <Button
              variant="outline"
              onClick={resetAppSettings}
              disabled={settingsLoading}
            >
              Reset
            </Button>
          </div>
        </FieldGroup>

        <FieldGroup className="gap-6">
          <div>
            <h2 className="text-sm font-medium">New compilation defaults</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Saved in this browser for the project setup flow.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="default-songs">
                Songs per compilation
              </FieldLabel>
              <Input
                id="default-songs"
                type="number"
                min={1}
                max={50}
                value={defaults.songsCount}
                onChange={(e) =>
                  setDefaults((c) => ({
                    ...c,
                    songsCount: Number(e.target.value),
                  }))
                }
              />
              <FieldDescription>
                How many songs the app tries to include in each new edit.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="default-clip">
                Clip length (seconds)
              </FieldLabel>
              <Input
                id="default-clip"
                type="number"
                min={3}
                value={defaults.clipTime}
                onChange={(e) =>
                  setDefaults((c) => ({
                    ...c,
                    clipTime: Number(e.target.value),
                  }))
                }
              />
              <FieldDescription>
                Length of each clip in the final compilation.
              </FieldDescription>
            </Field>
          </div>
          <Field>
            <FieldLabel>Song types</FieldLabel>
            <ToggleGroup
              type="multiple"
              value={defaults.songTypes}
              onValueChange={(types) =>
                setDefaults((c) => ({ ...c, songTypes: types }))
              }
              variant="outline"
            >
              <ToggleGroupItem value="opening">Opening</ToggleGroupItem>
              <ToggleGroupItem value="ending">Ending</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              Which theme types to search when you start a new compilation.
            </FieldDescription>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="default-encoder">Encoder</FieldLabel>
              <Select
                value={defaults.encoder}
                onValueChange={(encoder) =>
                  setDefaults((c) => ({ ...c, encoder }))
                }
              >
                <SelectTrigger id="default-encoder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="libx264">H.264</SelectItem>
                  <SelectItem value="h264_nvenc">NVENC H.264</SelectItem>
                  <SelectItem value="hevc_nvenc">NVENC HEVC</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Video encoder for the final export. Auto picks the best option
                on your machine.
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="default-audio"
                checked={defaults.audioNormalize}
                onCheckedChange={(audioNormalize) =>
                  setDefaults((c) => ({ ...c, audioNormalize }))
                }
              />
              <FieldLabel htmlFor="default-audio">Normalize audio</FieldLabel>
            </Field>
          </div>
          <FieldDescription>
            Match clip loudness before the final render. Helpful when sources
            vary in volume.
          </FieldDescription>
          <div className="flex gap-2">
            <Button onClick={saveDefaults}>Save defaults</Button>
            <Button variant="outline" onClick={resetDefaults}>
              Reset defaults
            </Button>
          </div>
        </FieldGroup>
      </div>
    </div>
  )
}
