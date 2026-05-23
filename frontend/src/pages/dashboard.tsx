import { useDeferredValue, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Folder01Icon,
  MoreVerticalIcon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { api } from "@/api"
import {
  getProjectAction,
  getStatusCopy,
  isUserGatedStatus,
  type StatusTone,
} from "@/pipeline"
import { errorToMessage } from "@/lib/errors"
import { NAV } from "@/lib/nav"
import type { Project, ProjectStatus } from "@/types"
import { PageHeader } from "@/components/page-header"
import { ProjectNavLink } from "@/components/project-nav-link"
import { ProjectThumbnail } from "@/components/project-thumbnail"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { projectVtName } from "@/lib/view-transitions"

type ListFilter = "all" | "attention" | "ready"

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function projectPriority(status: ProjectStatus): number {
  if (isUserGatedStatus(status) || status === "FAILED") return 0
  if (
    [
      "LOADING_THEMES",
      "SOURCING",
      "DOWNLOADING",
      "PROBING_NORMALIZING",
      "CUTTING",
      "OVERLAYING",
      "RENDERING",
    ].includes(status)
  ) {
    return 1
  }
  if (status === "COMPLETED") return 2
  return 3
}

function showsPreview(project: Project): string {
  const names = project.animes.map((a) => a.anime_name)
  if (names.length === 0) return "No shows added"
  if (names.length <= 2) return names.join(" · ")
  return `${names[0]} · ${names[1]} +${names.length - 2} more`
}

function cardAccent(
  tone: StatusTone,
  needsYou: boolean,
  isCompleted: boolean
): string {
  if (needsYou) {
    return "fcr-float-2 fcr-glass-lime border-primary/35 bg-primary/[0.06] hover:border-primary/55 hover:bg-primary/10 fcr-glow-primary-md-on-hover"
  }
  if (isCompleted) {
    return "fcr-float-1 border-border/70 bg-card/25 hover:border-primary/20 hover:bg-card/50"
  }
  if (tone === "success") {
    return "fcr-float-1 border-border/80 bg-card/40 hover:border-primary/25 hover:bg-card/70"
  }
  return "fcr-float-1 border-border/80 bg-card/30 hover:border-border hover:bg-card/60"
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [binaries, setBinaries] = useState<
    Record<string, { available: boolean; detail: string }>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [listFilter, setListFilter] = useState<ListFilter>("all")
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [renderAgainTarget, setRenderAgainTarget] = useState<Project | null>(
    null
  )
  const [renderingAgain, setRenderingAgain] = useState(false)

  const load = (options?: { showLoading?: boolean }) => {
    if (options?.showLoading !== false) setLoading(true)
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => {
        const msg = errorToMessage(e)
        setError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
    api
      .binaries()
      .then(setBinaries)
      .catch(() => {})
  }

  useEffect(() => {
    let cancelled = false
    api
      .listProjects()
      .then((data) => {
        if (!cancelled) setProjects(data)
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
    api
      .binaries()
      .then((data) => {
        if (!cancelled) setBinaries(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const missing = Object.entries(binaries).filter(([, v]) => !v.available)

  const counts = (() => {
    const attention = projects.filter(
      (p) => isUserGatedStatus(p.status) || p.status === "FAILED"
    ).length
    const ready = projects.filter((p) => p.status === "COMPLETED").length
    return { attention, ready, all: projects.length }
  })()

  const filteredProjects = (() => {
    const q = deferredQuery.trim().toLowerCase()
    let list = [...projects]

    if (listFilter === "attention") {
      list = list.filter(
        (p) => isUserGatedStatus(p.status) || p.status === "FAILED"
      )
    } else if (listFilter === "ready") {
      list = list.filter((p) => p.status === "COMPLETED")
    }

    if (q) {
      list = list.filter((p) => {
        const copy = getStatusCopy(p.status)
        return (
          p.title.toLowerCase().includes(q) ||
          copy.label.toLowerCase().includes(q) ||
          p.animes
            .map((a) => a.anime_name)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      })
    }

    return list.sort((a, b) => {
      const priority = projectPriority(a.status) - projectPriority(b.status)
      if (priority !== 0) return priority
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  })()

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteProject(deleteTarget.id)
      toast.info("Compilation removed")
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error(errorToMessage(e))
    }
  }

  const handleRenderAgain = async () => {
    if (!renderAgainTarget) return
    setRenderingAgain(true)
    try {
      await api.renderAgain(renderAgainTarget.id)
      toast.success("Rendering again")
      setRenderAgainTarget(null)
      load({ showLoading: false })
    } catch (e) {
      toast.error(errorToMessage(e))
    } finally {
      setRenderingAgain(false)
    }
  }

  const filterOptions: { id: ListFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "attention", label: "Needs you", count: counts.attention },
    { id: "ready", label: "Ready to watch", count: counts.ready },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title={NAV.projects}
        description="Pick up where you left off, or start a new compilation."
        actions={
          <Button asChild size="lg" className="fcr-glow-primary-md-to-lg">
            <Link to="/projects/new">
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              New compilation
            </Link>
          </Button>
        }
      />

      {missing.length > 0 && (
        <Alert className="fcr-glass fcr-animate-up fcr-delay-1">
          <AlertTitle>Local tools missing</AlertTitle>
          <AlertDescription>
            {missing.map(([k]) => k).join(", ")} not found. See{" "}
            <Link
              to="/settings"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {NAV.settings}
            </Link>{" "}
            for install hints.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="fcr-animate-up fcr-delay-1">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && projects.length > 0 && (
        <div className="flex flex-col gap-3 fcr-animate-up fcr-delay-1">
          <InputGroup className="h-10 w-full max-w-xl bg-muted/20 backdrop-blur-sm border-border/50">
            <InputGroupAddon align="inline-start">
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, status, or anime"
              aria-label="Search compilations"
            />
            {query && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => setQuery("")}>
                  Clear
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map(({ id, label, count }) => {
              const disabled = id === "attention" && count === 0
              return (
                <Button
                  key={id}
                  type="button"
                  variant={listFilter === id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 rounded-full px-3",
                    listFilter === id && "fcr-glow-primary-sm"
                  )}
                  disabled={disabled}
                  title={
                    disabled ? "Nothing needs your input right now" : undefined
                  }
                  onClick={() => setListFilter(id)}
                >
                  {label}
                  <Badge
                    variant={listFilter === id ? "secondary" : "outline"}
                    className="ml-1.5 h-5 min-w-5 justify-center px-1.5 text-[10px] tabular-nums"
                  >
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={`fcr-glass h-28 w-full rounded-xl sm:h-24 fcr-animate-up fcr-delay-${i + 1}`} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Empty className="fcr-glass border border-dashed border-border/80 bg-muted/20 py-16 fcr-animate-scale">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No compilations yet</EmptyTitle>
              <EmptyDescription>
                Name your edit, pick anime, and choose songs. The app sources
                clips and asks you to review at each step.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="lg">
                <Link to="/projects/new">Start a compilation</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : filteredProjects.length === 0 ? (
          <div className="py-10 text-center">
            {listFilter === "attention" ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  Nothing needs your input
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compilations waiting on song picks, clip review, or render
                  order will show up here.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No compilations match your search or filter.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredProjects.map((p, idx) => {
              const staggerClass = idx < 6 ? `fcr-delay-${idx + 1}` : ""
              const copy = getStatusCopy(p.status)
              const action = getProjectAction(p.status)
              const needsYou =
                isUserGatedStatus(p.status) || p.status === "FAILED"
              const isCompleted = p.status === "COMPLETED"
              const isRunning =
                !needsYou &&
                !isCompleted &&
                !["DRAFT", "CANCELLED"].includes(p.status)

              return (
                <li key={p.id}>
                  <article
                    className={cn(
                      "group relative overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow,transform] duration-200 fcr-animate-up",
                      staggerClass,
                      cardAccent(copy.tone, needsYou, isCompleted),
                      needsYou && "shadow-sm shadow-primary/10"
                    )}
                  >
                    <ProjectNavLink
                      project={p}
                      className="grid grid-cols-[4rem_minmax(0,1fr)] grid-rows-[auto_auto] items-start gap-x-3 gap-y-2 p-4 pr-14 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-center sm:gap-x-4 sm:gap-y-0 sm:p-5 sm:pr-16"
                    >
                      <div
                        className="col-start-1 row-start-1 row-span-2 self-center sm:row-span-1"
                        style={{
                          viewTransitionName: projectVtName("thumb", p.id),
                        }}
                      >
                        <ProjectThumbnail animes={p.animes} />
                      </div>
                      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={p.status} />
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            Updated {timeAgo(p.updated_at)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h2
                            className={cn(
                              "truncate font-heading font-semibold tracking-tight",
                              isCompleted
                                ? "text-sm sm:text-base"
                                : "text-base sm:text-lg"
                            )}
                            style={{
                              viewTransitionName: projectVtName("title", p.id),
                            }}
                          >
                            {p.title}
                          </h2>
                          <p className="truncate text-sm text-muted-foreground">
                            {showsPreview(p)}
                          </p>
                        </div>
                        {!isCompleted && (
                          <p
                            className={cn(
                              "text-sm",
                              needsYou
                                ? "font-medium text-foreground"
                                : isRunning
                                  ? "text-foreground/80"
                                  : "text-muted-foreground"
                            )}
                          >
                            {copy.description}
                          </p>
                        )}
                      </div>

                      <span
                        className={cn(
                          "col-start-2 row-start-2 inline-flex w-fit shrink-0 items-center gap-1 self-start rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:col-start-3 sm:row-start-1 sm:self-center",
                          needsYou
                            ? "bg-primary text-primary-foreground fcr-glow-primary-lg-on-group-hover group-hover:bg-primary/90"
                            : "bg-muted/60 text-foreground group-hover:bg-primary/15 group-hover:text-primary"
                        )}
                      >
                        {action}
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          strokeWidth={2}
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </ProjectNavLink>

                    <div className="absolute inset-y-0 right-3 flex items-center sm:right-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            aria-label={`Actions for ${p.title}`}
                          >
                            <HugeiconsIcon
                              icon={MoreVerticalIcon}
                              strokeWidth={2}
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isCompleted && (
                            <DropdownMenuItem
                              onClick={() => setRenderAgainTarget(p)}
                            >
                              <HugeiconsIcon
                                icon={RefreshIcon}
                                strokeWidth={2}
                                data-icon="inline-start"
                              />
                              Render again
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <AlertDialog
        open={!!renderAgainTarget}
        onOpenChange={(open) => !open && setRenderAgainTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Render again?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{renderAgainTarget?.title}&rdquo; will be rebuilt from its
              existing clips and settings. This can take several minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRenderAgain()}
              disabled={renderingAgain}
            >
              Render again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove compilation?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and its files on disk will be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
