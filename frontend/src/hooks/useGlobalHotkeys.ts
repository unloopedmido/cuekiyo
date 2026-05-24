import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useShortcutsRegistry } from "@/hooks/useKeyboardShortcuts"
import { openCommandPalette } from "@/lib/command-palette-bus"
import { restartTour } from "@/lib/tour-bus"
import { viewTransitionNavigate } from "@/lib/view-transitions"

export function useGlobalHotkeys() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useShortcutsRegistry()

  const mod = navigator.platform.toLowerCase().includes("mac") ? "meta" : "ctrl"

  useEffect(() => {
    const defs = [
      {
        ...(mod === "meta" ? { meta: true } : { ctrl: true }),
        key: "k",
        description: "Open command palette",
        allowInInputs: true,
        handler: () => openCommandPalette(),
      },
      {
        [mod]: true,
        shift: true,
        key: "d",
        description: "Go to projects",
        handler: () => {
          const onProjectDetail = /^\/projects\/[^/]+$/.test(location.pathname)
          if (onProjectDetail) {
            viewTransitionNavigate(navigate, "/", { direction: "back" })
          } else {
            navigate("/")
          }
        },
      },
      {
        [mod]: true,
        shift: true,
        key: "n",
        description: "New compilation",
        handler: () => navigate("/projects/new"),
      },
      {
        [mod]: true,
        shift: true,
        key: "s",
        description: "Go to Settings",
        handler: () => navigate("/settings"),
      },
      {
        [mod]: true,
        shift: true,
        key: "p",
        description: "Go to current project",
        handler: () => {
          const m = window.location.pathname.match(/\/projects\/([^/]+)/)
          if (m) navigate(`/projects/${m[1]}`)
        },
      },
      {
        key: "t",
        description: "Restart tour",
        handler: () => restartTour(),
      },
    ]
    return register(defs as Parameters<typeof register>[0])
  }, [register, navigate, mod, location.pathname])
}
