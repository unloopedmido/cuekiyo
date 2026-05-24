import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArchiveArrowDownIcon,
  ClipboardCopyIcon,
  Download01Icon,
  Film01Icon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  RefreshIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import { errorToMessage } from "@/lib/errors"
import { formatEncoder, formatSongType } from "@/lib/nav"
import type { Project } from "@/types"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"

export function CompletedOutput({
  projectId,
  project,
  onRenderStarted,
}: {
  projectId: string
  project: Project
  onRenderStarted?: () => void
}) {
  const [out, setOut] = useState<{
    output_path: string | null
    output_filename: string | null
    exists: boolean
  } | null>(null)
  const [error, setError] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [overlayConfirmOpen, setOverlayConfirmOpen] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [reapplyingOverlay, setReapplyingOverlay] = useState(false)

  useEffect(() => {
    api
      .getOutput(projectId)
      .then(setOut)
      .catch(() => setError(true))
  }, [projectId])

  const filename =
    out?.output_filename ??
    (out?.output_path ? out.output_path.split("/").pop() : null) ??
    (project.output_path ? project.output_path.split("/").pop() : null)
  const filePath = out?.output_path ?? project.output_path

  const copyPath = async () => {
    if (!filePath) return
    try {
      await navigator.clipboard.writeText(filePath)
      toast.success("File path copied")
    } catch {
      toast.error("Could not copy path")
    }
  }

  const startRenderAgain = async () => {
    setRendering(true)
    try {
      await api.renderAgain(projectId)
      setConfirmOpen(false)
      toast.success("Rendering again")
      onRenderStarted?.()
    } catch (e) {
      toast.error(errorToMessage(e))
    }
    setRendering(false)
  }

  const startReapplyOverlay = async () => {
    setReapplyingOverlay(true)
    try {
      await api.reprocess(projectId, "overlay")
      setOverlayConfirmOpen(false)
      toast.success("Re-applying overlay")
      onRenderStarted?.()
    } catch (e) {
      toast.error(errorToMessage(e))
    }
    setReapplyingOverlay(false)
  }

  if (!out && !error) {
    return <Skeleton className="aspect-video w-full max-w-3xl rounded-xl" />
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Could not reach the output endpoint. Is the backend running?
      </p>
    )
  }

  const songTypes = project.song_types.map(formatSongType).join(", ")

  return (
    <section className="flex flex-col gap-8">
      {out?.exists ? (
        <>
          {/* ── Video hero ──────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 shadow-lg">
            <div className="relative aspect-video w-full bg-background/60">
              <video
                className="size-full"
                controls
                aria-label="Final output preview"
                src={`/api/projects/${projectId}/output/download`}
              />
            </div>
          </div>

          {/* ── Primary CTA ─────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4 text-center">
            <Button
              asChild
              size="lg"
              className="h-14 gap-2 px-8 text-base fcr-glow-primary-md-to-lg"
            >
              <a
                href={`/api/projects/${projectId}/output/download`}
                download
                target="_blank"
                rel="noreferrer"
              >
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-5" />
                Open output
              </a>
            </Button>
            {filename && (
              <p className="text-xs text-muted-foreground">{filename}</p>
            )}
          </div>

          {/* ── Anime source strip ──────────────────────────────── */}
          {project.animes.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {project.animes.map((anime) => (
                <div
                  key={anime.anime_mal_id}
                  className="flex shrink-0 items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2"
                >
                  {anime.image_url ? (
                    <img
                      src={anime.image_url}
                      alt=""
                      className="size-9 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="size-9 rounded bg-muted/60" />
                  )}
                  <span className="whitespace-nowrap text-sm font-medium">
                    {anime.anime_name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Compilation details ─────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Film01Icon} strokeWidth={1.5} className="size-4" />
              <span>{project.songs_count} songs</span>
            </div>
            <span aria-hidden className="text-border">|</span>
            <span>{songTypes}</span>
            <span aria-hidden className="text-border">|</span>
            <span>{project.clip_time}s clips</span>
            <span aria-hidden className="text-border">|</span>
            <span>{formatEncoder(project.encoder)}</span>
            {project.audio_normalize && (
              <>
                <span aria-hidden className="text-border">|</span>
                <span>Normalized</span>
              </>
            )}
          </div>

          {/* ── Utility actions ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a
                href={api.allClipsZipUrl(projectId, "overlay")}
                download
                target="_blank"
                rel="noreferrer"
              >
                <HugeiconsIcon icon={ArchiveArrowDownIcon} strokeWidth={2} className="size-3.5" />
                Download all clips
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                api
                  .openOutputFolder(projectId)
                  .catch((e) => toast.error(errorToMessage(e)))
              }
            >
              <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} className="size-3.5" />
              Reveal in folder
            </Button>
            {filePath && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void copyPath()}
              >
                <HugeiconsIcon icon={ClipboardCopyIcon} strokeWidth={2} className="size-3.5" />
                Copy path
              </Button>
            )}
          </div>

          {/* ── Re-export section ───────────────────────────────── */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/10 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="size-3.5" />
              Re-export
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setOverlayConfirmOpen(true)}
              >
                <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
                Re-apply overlay
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmOpen(true)}
              >
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-3.5" />
                Render again
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/80 bg-muted/15 p-6">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Film01Icon} strokeWidth={1.5} className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Output file not found</p>
          </div>
          <p className="text-sm text-muted-foreground">
            The file may have been moved or deleted. Check project logs or retry from a previous stage.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setOverlayConfirmOpen(true)}
            >
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-4" />
              Re-apply overlay
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setConfirmOpen(true)}
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
              Render again
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={overlayConfirmOpen} onOpenChange={setOverlayConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-apply overlay?</AlertDialogTitle>
            <AlertDialogDescription>
              Reuses downloaded clips — only regenerates lower-thirds and
              re-concatenates if needed. Source videos will not be downloaded
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void startReapplyOverlay()}
              disabled={reapplyingOverlay}
            >
              {reapplyingOverlay && <LoadingSpinner data-icon="inline-start" />}
              Re-apply overlay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Render again?</AlertDialogTitle>
            <AlertDialogDescription>
              The final video will be rebuilt from your existing clips and
              settings. This can take several minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void startRenderAgain()}
              disabled={rendering}
            >
              {rendering && <LoadingSpinner data-icon="inline-start" />}
              Render again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
