import { flushSync } from "react-dom"
import type { NavigateFunction, To } from "react-router-dom"
import type { Project } from "@/types"

export type ProjectNavState = {
  projectTitle?: string
  projectAnimes?: Project["animes"]
}

export type NavDirection = "forward" | "back"

function supportsViewTransitions(): boolean {
  return typeof document.startViewTransition === "function"
}

export function projectVtName(
  kind: "thumb" | "title",
  projectId: string
): string {
  return `project-${kind}-${projectId}`
}

export function viewTransitionNavigate(
  navigate: NavigateFunction,
  to: To,
  options?: {
    direction?: NavDirection
    state?: ProjectNavState
    replace?: boolean
  }
): void {
  const root = document.documentElement
  if (options?.direction) {
    root.dataset.vtDirection = options.direction
  }

  const commit = () => {
    flushSync(() => {
      navigate(to, {
        state: options?.state,
        replace: options?.replace,
      })
    })
  }

  const finish = () => {
    delete root.dataset.vtDirection
  }

  if (!supportsViewTransitions()) {
    commit()
    finish()
    return
  }

  document.startViewTransition(commit).finished.finally(finish)
}

export const persistentVt = {
  header: "app-header",
  sidebar: "app-sidebar",
} as const
