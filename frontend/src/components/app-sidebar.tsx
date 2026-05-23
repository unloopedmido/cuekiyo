import { useCallback, useEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  CommandIcon,
  Folder01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { BrandWordmark } from "@/components/brand-wordmark"
import { openCommandPalette } from "@/lib/command-palette-bus"
import { api } from "@/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { NAV } from "@/lib/nav"
import { viewTransitionNavigate } from "@/lib/view-transitions"
import { cn } from "@/lib/utils"
import type { Project } from "@/types"

const MAX_RECENT = 5

function getModKey(): string {
  if (typeof navigator === "undefined") return "⌘"
  if (/Win|Linux|Android/i.test(navigator.userAgent)) return "Ctrl"
  return "⌘"
}

const ACTIVE_STATUSES = new Set([
  "LOADING_THEMES",
  "SONG_SELECTION",
  "SOURCING",
  "DOWNLOADING",
  "PROBING_NORMALIZING",
  "CUTTING",
  "OVERLAYING",
  "RENDERING",
])

const ERROR_STATUSES = new Set(["FAILED", "CANCELLED"])

const STATUS_LABELS: Record<"active" | "idle" | "done" | "error", string> = {
  active: "Processing",
  idle: "Idle",
  done: "Completed",
  error: "Failed",
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function getSidebarStatus(
  status: Project["status"],
): "active" | "idle" | "done" | "error" {
  if (ACTIVE_STATUSES.has(status)) return "active"
  if (ERROR_STATUSES.has(status)) return "error"
  if (status === "COMPLETED") return "done"
  return "idle"
}

const navItems: {
  to: string
  label: string
  icon: typeof Folder01Icon
  end?: boolean
  morphBack?: boolean
}[] = [
  {
    to: "/",
    label: NAV.projects,
    icon: Folder01Icon,
    end: true,
    morphBack: true,
  },
  { to: "/projects/new", label: NAV.newCompilation, icon: Add01Icon },
  { to: "/settings", label: NAV.settings, icon: Settings01Icon },
]

function SidebarNavItem({
  to,
  label,
  icon,
  end,
  morphBack,
}: {
  to: string
  label: string
  icon: typeof Folder01Icon
  end?: boolean
  morphBack?: boolean
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const onProjectDetail = /^\/projects\/[^/]+$/.test(location.pathname)
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to)

  if (morphBack && onProjectDetail && to === "/") {
    return (
      <SidebarMenuButton asChild tooltip={label} isActive={morphBack && onProjectDetail}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            viewTransitionNavigate(navigate, "/", { direction: "back" })
          }}
        >
          <HugeiconsIcon icon={icon} strokeWidth={1.5} size={18} />
          <span>{label}</span>
        </a>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuButton asChild tooltip={label} isActive={isActive}>
      <NavLink to={to} end={end}>
        <HugeiconsIcon icon={icon} strokeWidth={1.5} size={18} />
        <span>{label}</span>
      </NavLink>
    </SidebarMenuButton>
  )
}

function RecentProjectItem({ project }: { project: Project }) {
  const navigate = useNavigate()
  const status = getSidebarStatus(project.status)

  return (
    <SidebarMenuButton asChild tooltip={project.title} className="group/recent">
      <a
        href={`/projects/${project.id}`}
        onClick={(e) => {
          e.preventDefault()
          viewTransitionNavigate(navigate, `/projects/${project.id}`, {
            direction: "forward",
            state: {
              projectTitle: project.title,
              projectAnimes: project.animes,
            },
          })
        }}
        className="sidebar-recent-item"
      >
        <span
          className="sidebar-status-dot"
          data-status={status}
          role="status"
          aria-label={STATUS_LABELS[status]}
          title={STATUS_LABELS[status]}
        />
        <span className="min-w-0 flex-col gap-0 leading-none">
          <span className="truncate text-xs leading-tight text-muted-foreground/80 group-hover/recent:text-foreground/90 transition-colors duration-150">
            {project.title}
          </span>
          <span className="sidebar-recent-meta text-muted-foreground/55">
            {formatRelativeTime(project.updated_at)}
            {project.animes.length > 0 && (
              <span className="before:content-['·'] before:mx-1 before:text-muted-foreground/30">
                {project.animes.map((a) => a.anime_name).join(", ")}
              </span>
            )}
          </span>
        </span>
      </a>
    </SidebarMenuButton>
  )
}

function RecentProjectsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <SidebarMenuItem key={i}>
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Skeleton className="size-1.5 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
        </SidebarMenuItem>
      ))}
    </>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile } = useSidebar()
  const collapsed = !isMobile && state === "collapsed"
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState(false)
  const [totalProjects, setTotalProjects] = useState(0)

  const fetchProjects = useCallback(() => {
    let cancelled = false
    setRecentLoading(true)
    setRecentError(false)
    api
      .listProjects()
      .then((data) => {
        if (!cancelled) {
          setTotalProjects(data.length)
          setRecentProjects(
            data
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime()
              )
              .slice(0, MAX_RECENT)
          )
        }
      })
      .catch(() => {
        if (!cancelled) setRecentError(true)
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cleanup = fetchProjects()
    return cleanup
  }, [fetchProjects])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchProjects()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [fetchProjects])

  const showRecent =
    recentLoading || recentError || recentProjects.length > 0

  const hasMore = totalProjects > MAX_RECENT

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="sidebar-surface"
      {...props}
    >
      <SidebarHeader
        className={cn(
          "pt-5 pb-3",
          collapsed ? "px-2 pt-4" : "px-3",
        )}
      >
        <div
          className="flex items-center px-2 py-1"
        >
          <BrandWordmark
            variant="full"
            className={cn("min-w-0", collapsed && "hidden")}
          />
          <BrandWordmark
            variant="mark"
            className={cn("hidden", collapsed && "flex")}
          />
        </div>
        {!collapsed ? <div className="sidebar-edge-line mt-3" /> : null}
      </SidebarHeader>

      <SidebarContent className={cn("gap-0", collapsed ? "px-2" : "px-3")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map(({ to, label, icon, end, morphBack }) => (
                <SidebarMenuItem key={to}>
                  <SidebarNavItem
                    to={to}
                    label={label}
                    icon={icon}
                    end={end}
                    morphBack={morphBack}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showRecent && !collapsed && (
          <>
            <div className="sidebar-section-sep mx-1 my-2.5" />
            <SidebarGroup>
              <SidebarGroupLabel className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/55">
                Recent
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {recentLoading ? (
                    <RecentProjectsSkeleton />
                  ) : recentError ? (
                    <SidebarMenuItem>
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-xs text-muted-foreground/70">
                          Could not load projects
                        </span>
                        <button
                          type="button"
                          onClick={fetchProjects}
                          className="text-[11px] font-medium text-primary/80 transition-colors hover:text-primary"
                        >
                          Retry
                        </button>
                      </div>
                    </SidebarMenuItem>
                  ) : (
                    recentProjects.map((project) => (
                      <SidebarMenuItem key={project.id}>
                        <RecentProjectItem project={project} />
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
                {!recentLoading && !recentError && hasMore && (
                  <NavLink
                    to="/"
                    end
                    className="mt-1 block px-2 text-[11px] text-muted-foreground/55 transition-colors hover:text-foreground/60"
                  >
                    All projects
                  </NavLink>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter
        className={cn("p-3 pt-0", collapsed && "flex items-center justify-center p-2")}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openCommandPalette}
              className={cn("sidebar-cmd", collapsed && "sidebar-cmd-icon")}
              aria-label="Commands"
            >
              <HugeiconsIcon icon={CommandIcon} strokeWidth={1.5} size={16} />
              {!collapsed ? (
                <>
                  <span>Commands</span>
                  <kbd className="ml-auto hidden rounded border border-sidebar-border/40 bg-sidebar/50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/55 md:inline-block">
                    {getModKey()}K
                  </kbd>
                </>
              ) : null}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" hidden={!collapsed || isMobile}>
            Commands
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
