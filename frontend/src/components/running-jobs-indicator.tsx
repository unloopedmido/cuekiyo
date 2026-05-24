import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/api"
import type { Project } from "@/types"
import { RUNNING_STATUSES } from "@/pipeline"
import { viewTransitionNavigate } from "@/lib/view-transitions"

function getRunningProjects(projects: Project[]): Project[] {
  return projects.filter((p) => RUNNING_STATUSES.has(p.status))
}

export function RunningJobsIndicator() {
  const navigate = useNavigate()
  const [running, setRunning] = useState<Project[]>([])

  useEffect(() => {
    let cancelled = false
    const sync = () => {
      api
        .listProjects()
        .then((projects) => {
          if (!cancelled) setRunning(getRunningProjects(projects))
        })
        .catch(() => {
          if (!cancelled) setRunning([])
        })
    }
    sync()
    const t = setInterval(sync, 5000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  if (running.length === 0) return null

  const first = running[0]
  const label = running.length === 1 ? first.title : `${running.length} running`

  return (
    <button
      type="button"
      onClick={() => {
        viewTransitionNavigate(navigate, `/projects/${first.id}`, {
          direction: "forward",
          state: {
            projectTitle: first.title,
            projectAnimes: first.animes,
          },
        })
      }}
      className="ml-auto hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/[0.1] sm:inline-flex"
      aria-live="polite"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span className="max-w-[8rem] truncate">{label}</span>
    </button>
  )
}
