import { useEffect, useState } from "react"
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
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { NAV } from "@/lib/nav"
import { viewTransitionNavigate } from "@/lib/view-transitions"
import { cn } from "@/lib/utils"
import type { Project } from "@/types"

const MAX_RECENT = 5

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

  if (morphBack && onProjectDetail && to === "/") {
    return (
      <SidebarMenuButton asChild tooltip={label}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            viewTransitionNavigate(navigate, "/", { direction: "back" })
          }}
          className="sidebar-nav-item"
        >
          <HugeiconsIcon icon={icon} strokeWidth={1.5} size={18} />
          <span>{label}</span>
        </a>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuButton asChild tooltip={label}>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn("sidebar-nav-item", isActive && "sidebar-nav-active")
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={1.5} size={18} />
        <span>{label}</span>
      </NavLink>
    </SidebarMenuButton>
  )
}

function RecentProjectItem({ project }: { project: Project }) {
  const navigate = useNavigate()

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
          data-status={getSidebarStatus(project.status)}
        />
        <span className="truncate text-xs leading-tight text-muted-foreground/80 group-hover/recent:text-foreground/90 transition-colors duration-150">
          {project.title}
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
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState(false)
  const [totalProjects, setTotalProjects] = useState(0)

  useEffect(() => {
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

  const showRecent =
    recentLoading || recentError || recentProjects.length > 0

  const hasMore = totalProjects > MAX_RECENT

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="sidebar-surface border-r border-sidebar-border"
      {...props}
    >
      <SidebarHeader className="px-3 pt-5 pb-3">
        <div className="flex items-center px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <BrandWordmark
            variant="full"
            className="min-w-0 group-data-[collapsible=icon]:hidden"
          />
          <BrandWordmark
            variant="mark"
            className="hidden group-data-[collapsible=icon]:flex"
          />
        </div>
        <div className="sidebar-edge-line mt-3" />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3">
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

        {showRecent && (
          <>
            <div className="sidebar-section-sep mx-1 my-2.5" />
            <SidebarGroup>
              <SidebarGroupLabel className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
                Recent
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {recentLoading ? (
                    <RecentProjectsSkeleton />
                  ) : recentError ? (
                    <SidebarMenuItem>
                      <span className="px-2 text-xs text-muted-foreground/50">
                        Could not load projects
                      </span>
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
                    className="mt-1 block px-2 text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/60"
                  >
                    All projects
                  </NavLink>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 pt-0">
        <button
          type="button"
          onClick={openCommandPalette}
          className="sidebar-cmd group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
        >
          <HugeiconsIcon
            icon={CommandIcon}
            strokeWidth={1.5}
            size={16}
            data-icon="inline-start"
          />
          <span className="group-data-[collapsible=icon]:hidden">Commands</span>
          <kbd className="ml-auto hidden rounded border border-sidebar-border/40 bg-sidebar/50 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/40 group-data-[collapsible=icon]:hidden md:inline-block">
            ⌘K
          </kbd>
        </button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
