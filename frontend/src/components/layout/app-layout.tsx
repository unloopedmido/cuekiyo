import { useEffect, type CSSProperties } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeftIcon,
  Folder01Icon,
  Settings02Icon,
  Video02Icon,
} from "@hugeicons/core-free-icons"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help"
import { LegalNoticeGate } from "@/components/legal-notice-gate"
import { RunningJobsIndicator } from "@/components/running-jobs-indicator"
import { TourGuide } from "@/components/tour-guide"
import { TourProvider } from "@/context/tour"
import { PageMetaProvider, usePageMetaContext } from "@/context/page-meta"
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys"
import { BRAND } from "@/lib/brand"
import { NAV } from "@/lib/nav"
import { viewTransitionNavigate } from "@/lib/view-transitions"
import { persistentVt } from "@/lib/view-transitions"

function useDocumentTitle() {
  const { pathname } = useLocation()
  const { meta } = usePageMetaContext()

  useEffect(() => {
    let title: string = BRAND.name
    if (meta.documentTitle) {
      title = `${meta.documentTitle} \u2013 ${BRAND.name}`
    } else if (pathname === "/") {
      title = `${NAV.projects} \u2013 ${BRAND.name}`
    } else if (pathname === "/projects/new") {
      title = `${NAV.newCompilation} \u2013 ${BRAND.name}`
    } else if (pathname === "/settings") {
      title = `${NAV.settings} \u2013 ${BRAND.name}`
    }
    document.title = title
  }, [pathname, meta.documentTitle])
}

const iconMap: Record<string, typeof Folder01Icon> = {
  [NAV.projects]: Folder01Icon,
  [NAV.newCompilation]: Video02Icon,
  [NAV.settings]: Settings02Icon,
}

function BreadcrumbTrail({
  crumbs,
}: {
  crumbs: { label: string; href?: string; back?: boolean }[]
}) {
  const navigate = useNavigate()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const Icon = iconMap[crumb.label]
          return (
            <span key={`${crumb.label}-${i}`} className="contents">
              {i > 0 && (
                <BreadcrumbSeparator className="text-muted-foreground/40">
                  /
                </BreadcrumbSeparator>
              )}
              <BreadcrumbItem className="max-w-[14rem] truncate sm:max-w-xs">
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    {crumb.back ? (
                      <a
                        href={crumb.href}
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault()
                          viewTransitionNavigate(navigate, crumb.href!, {
                            direction: "back",
                          })
                        }}
                      >
                        <HugeiconsIcon
                          icon={ArrowLeftIcon}
                          size={14}
                          strokeWidth={1.5}
                        />
                        <span>{crumb.label}</span>
                      </a>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {Icon && (
                          <HugeiconsIcon
                            icon={Icon}
                            size={14}
                            strokeWidth={1.5}
                          />
                        )}
                        <span>{crumb.label}</span>
                      </Link>
                    )}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="inline-flex items-center gap-1.5 truncate text-foreground/80">
                    {Icon && (
                      <HugeiconsIcon
                        icon={Icon}
                        size={14}
                        strokeWidth={1.5}
                        className="text-muted-foreground/60"
                      />
                    )}
                    <span>{crumb.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function Breadcrumbs() {
  const { pathname, state } = useLocation()
  const { meta } = usePageMetaContext()
  const navTitle = (state as { projectTitle?: string } | null)?.projectTitle

  if (pathname === "/") {
    return <BreadcrumbTrail crumbs={[{ label: NAV.projects }]} />
  }

  if (pathname === "/settings") {
    return <BreadcrumbTrail crumbs={[{ label: NAV.settings }]} />
  }

  if (pathname === "/projects/new") {
    return <BreadcrumbTrail crumbs={[{ label: NAV.newCompilation }]} />
  }

  if (pathname.startsWith("/projects/")) {
    const label = meta.breadcrumb ?? navTitle ?? "Loading\u2026"
    return (
      <BreadcrumbTrail
        crumbs={[{ label: NAV.projects, href: "/", back: true }, { label }]}
      />
    )
  }

  return null
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
    >
      Skip to main content
    </a>
  )
}

const headerVtStyle: CSSProperties = {
  viewTransitionName: persistentVt.header,
}

const sidebarVtStyle: CSSProperties = {
  viewTransitionName: persistentVt.sidebar,
}

function AppLayoutInner() {
  useDocumentTitle()
  useGlobalHotkeys()
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as CSSProperties
      }
    >
      <SkipLink />
      <AppSidebar style={sidebarVtStyle} />
      <SidebarInset>
        <header
          className="sticky top-0 z-50 flex h-14 shrink-0 items-center border-b border-border bg-background/95 backdrop-blur-sm px-4"
          style={headerVtStyle}
        >
          <div className="flex flex-1 items-center gap-3">
            <SidebarTrigger className="-ml-1 transition-colors hover:bg-sidebar-accent" />
            <div className="h-4 w-px bg-border" />
            <Breadcrumbs />
            <RunningJobsIndicator />
          </div>
        </header>
        <main
          id="main-content"
          className="flex flex-1 flex-col px-4 py-6 md:px-8 md:py-8"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <TourProvider>
        <TourGuide />
      </TourProvider>
      <CommandPalette />
      <KeyboardShortcutsHelp />
    </SidebarProvider>
  )
}

export function AppLayout() {
  return (
    <PageMetaProvider>
      <LegalNoticeGate>
        <AppLayoutInner />
      </LegalNoticeGate>
    </PageMetaProvider>
  )
}
