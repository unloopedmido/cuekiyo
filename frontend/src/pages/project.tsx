import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { api, connectWebSocket } from "@/api"
import { usePolling } from "@/hooks/usePolling"
import { errorToMessage } from "@/lib/errors"
import { RUNNING_STATUSES, getStatusCopy, isUserGatedStatus } from "@/pipeline"
import type { ProgressEvent, Project } from "@/types"
import { CandidateSelection } from "@/components/candidate-selection"
import { CompletedOutput } from "@/components/completed-output"
import { CompilationSummary } from "@/components/compilation-summary"
import { PageHeader } from "@/components/page-header"
import { PipelineStepper } from "@/components/pipeline-stepper"
import { ProgressPanel } from "@/components/progress-panel"
import { RenderOrder } from "@/components/render-order"
import { SongSelection } from "@/components/song-selection"
import { StatusBadge } from "@/components/status-badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageMeta } from "@/context/page-meta"

function loadProject(
  id: string,
  setProject: (project: Project) => void,
  setError: (message: string) => void
) {
  api
    .getProject(id)
    .then(setProject)
    .catch((e) => setError(errorToMessage(e)))
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navTitle = (location.state as { projectTitle?: string } | null)
    ?.projectTitle
  const [project, setProject] = useState<Project | null>(null)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const refresh = () => {
    if (!id) return
    loadProject(id, setProject, setError)
  }

  useEffect(() => {
    if (!id) return
    loadProject(id, setProject, setError)
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const ws = connectWebSocket((data) => {
      const ev = data as ProgressEvent
      if (ev.projectId === id) {
        setProgress(ev)
        loadProject(id, setProject, setError)
      }
    })
    const handleOpen = () => {
      if (cancelled) ws.close()
    }
    ws.addEventListener("open", handleOpen)
    return () => {
      cancelled = true
      ws.removeEventListener("open", handleOpen)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [id])

  usePolling(
    refresh,
    RUNNING_STATUSES.has(project?.status ?? "DRAFT") ? 3000 : 15000,
    `${id ?? ""}:${project?.status ?? ""}`
  )

  const running = RUNNING_STATUSES.has(project?.status ?? "DRAFT")
  const displayedProgress =
    progress && progress.stage === project?.status ? progress : null
  const statusCopy = project ? getStatusCopy(project.status) : null

  usePageMeta(project?.title ?? navTitle)

  if (!id) return null

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader
        title={project.title}
        description={
          project.status === "COMPLETED" ? undefined : statusCopy?.description
        }
        meta={<CompilationSummary project={project} />}
        actions={<StatusBadge status={project.status} />}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PipelineStepper status={project.status} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {running && (
            <ProgressPanel
              projectId={id}
              projectStatus={project.status}
              progress={displayedProgress}
              onCancel={() =>
                api
                  .cancel(id)
                  .then(() => {
                    refresh()
                    toast.info("Stopped")
                  })
                  .catch((e) => {
                    const msg = errorToMessage(e)
                    setError(msg)
                    toast.error(msg)
                  })
              }
            />
          )}

          {project.status === "SONG_SELECTION" && (
            <SongSelection project={project} onDone={refresh} />
          )}
          {project.status === "AWAITING_CANDIDATES" && (
            <CandidateSelection projectId={id} onDone={refresh} />
          )}
          {project.status === "AWAITING_RENDER_ORDER" && (
            <RenderOrder projectId={id} onDone={refresh} />
          )}
          {project.status === "COMPLETED" && (
            <CompletedOutput projectId={id} project={project} />
          )}

          {project.status === "DRAFT" && (
            <section className="flex flex-col gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 md:p-8">
              <h2 className="font-heading text-xl font-semibold">
                Begin sourcing
              </h2>
              <p className="max-w-prose text-sm text-muted-foreground">
                Load opening and ending themes for your selected anime. Song
                picks start once metadata is ready.
              </p>
              <Button
                size="lg"
                disabled={starting}
                onClick={() => {
                  setStarting(true)
                  api
                    .loadThemes(id)
                    .then(() => {
                      refresh()
                      toast.success("Loading themes")
                    })
                    .catch((e) => {
                      const msg = errorToMessage(e)
                      setError(msg)
                      toast.error(msg)
                    })
                    .finally(() => setStarting(false))
                }}
              >
                {starting && <LoadingSpinner data-icon="inline-start" />}
                Load themes
              </Button>
            </section>
          )}

          {project.status === "FAILED" && (
            <section className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
              <h2 className="font-heading text-xl font-semibold text-destructive">
                Something went wrong
              </h2>
              <p className="max-w-prose text-sm text-muted-foreground">
                The export stopped before finishing. You can retry the failed
                stage after reviewing what went wrong.
              </p>
              {project.error_message && (
                <details className="rounded-lg border bg-background/60">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                    Technical details
                  </summary>
                  <pre className="overflow-x-auto border-t p-3 text-xs leading-relaxed text-muted-foreground">
                    {project.error_message}
                  </pre>
                </details>
              )}
              <Button
                disabled={retrying}
                onClick={() => {
                  setRetrying(true)
                  api
                    .retry(id)
                    .then(() => {
                      refresh()
                      toast.success("Retrying")
                    })
                    .catch((e) => {
                      const msg = errorToMessage(e)
                      setError(msg)
                      toast.error(msg)
                    })
                    .finally(() => setRetrying(false))
                }}
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                {retrying ? "Retrying..." : "Retry failed stage"}
              </Button>
            </section>
          )}

          {project.status === "CANCELLED" && (
            <section className="rounded-xl border border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Compilation stopped</p>
              <p className="mt-2">
                This project was cancelled before export.{" "}
                <Link
                  to="/"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Back to projects
                </Link>
                .
              </p>
            </section>
          )}

          {!running &&
            !isUserGatedStatus(project.status) &&
            !["DRAFT", "FAILED", "CANCELLED", "COMPLETED"].includes(
              project.status
            ) && (
              <p className="text-sm text-muted-foreground">
                Automated stages are running. This view refreshes when your
                input is needed again.
              </p>
            )}
        </div>
      </div>
    </div>
  )
}
