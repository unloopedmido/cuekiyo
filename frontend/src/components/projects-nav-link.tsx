import type { MouseEvent, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { viewTransitionNavigate } from "@/lib/view-transitions"

type ProjectsNavLinkProps = {
  className?: string
  children: ReactNode
}

export function ProjectsNavLink({ className, children }: ProjectsNavLinkProps) {
  const navigate = useNavigate()

  return (
    <a
      href="/"
      className={className}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        viewTransitionNavigate(navigate, "/", { direction: "back" })
      }}
    >
      {children}
    </a>
  )
}
