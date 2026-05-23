import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ClipboardCopyIcon,
  Download01Icon,
  Film01Icon,
  FolderOpenIcon,
  RefreshIcon,
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
import { cn } from "@/lib/utils"

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
  const [rendering, setRendering] = useState(false)

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
    } finally {
      setRendering(false)
    }
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
          <div className="relative overflow-hidden rounded-xl bg-black/80 shadow-lg">
            <video
              className="aspect-video w-full"
              controls
              aria-label="Final output preview"
              src={`/api/projects/${projectId}/output/download`}
            />
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

          {/* ── Actions ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gap-2">
              <a
                href={`/api/projects/${projectId}/output/download`}
                download
                target="_blank"
                rel="noreferrer"
              >
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-4" />
                Open output
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() =>
                api
                  .openOutputFolder(projectId)
                  .catch((e) => toast.error(errorToMessage(e)))
              }
            >
              <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={2} className="size-4" />
              Reveal in folder
            </Button>
            {filePath && (
              <Button
                variant="ghost"
                size="lg"
                className="gap-2"
                onClick={() => void copyPath()}
              >
                <HugeiconsIcon icon={ClipboardCopyIcon} strokeWidth={2} className="size-4" />
                Copy file path
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="gap-2 sm:ml-auto"
              onClick={() => setConfirmOpen(true)}
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
              Render again
            </Button>
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
          <Button
            variant="outline"
            className="w-fit gap-2"
            onClick={() => setConfirmOpen(true)}
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className="size-4" />
            Render again
          </Button>
        </div>
      )}

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
