import type { MouseEvent, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { Project } from "@/types"
import { viewTransitionNavigate } from "@/lib/view-transitions"

type ProjectNavLinkProps = {
  project: Project
  className?: string
  children: ReactNode
}

export function ProjectNavLink({
  project,
  className,
  children,
}: ProjectNavLinkProps) {
  const navigate = useNavigate()
  const href = `/projects/${project.id}`

  return (
    <a
      href={href}
      className={className}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        viewTransitionNavigate(navigate, href, {
          direction: "forward",
          state: {
            projectTitle: project.title,
            projectAnimes: project.animes,
          },
        })
      }}
    >
      {children}
    </a>
  )
}
