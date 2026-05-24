import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { setTourRestarter } from "@/lib/tour-bus"

const TOUR_KEY = "cuekiyo-tour-completed"
const TOUR_VERSION = "2"

interface TourStep {
  id: string
  title: string
  description: string
  target?: string
  placement?: "top" | "bottom" | "left" | "right"
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Three checkpoints, then a finished video",
    description:
      "Pick songs, review clips, order the renders. Everything else downloads, cuts, and renders on its own.",
  },
  {
    id: "new-compilation",
    title: "Start here",
    description:
      "Name your edit and pick shows. The app finds theme songs and asks which ones to use.",
    target: '[data-tour="new-compilation"]',
    placement: "bottom",
  },
  {
    id: "pipeline",
    title: "Your taste, automated work",
    description:
      "Song picks, clip review, and render order need your call. Downloading, cutting, and rendering run without you.",
    target: '[data-tour="pipeline"]',
    placement: "top",
  },
  {
    id: "command-palette",
    title: "Jump anywhere",
    description:
      "\u2318K opens a palette to find any compilation, retry a failed stage, or switch settings.",
    target: '[data-tour="command-palette"]',
    placement: "right",
  },
]

type TourContextValue = {
  isOpen: boolean
  currentStep: TourStep | undefined
  currentIndex: number
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  next: () => void
  prev: () => void
  skip: () => void
  restart: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function TourProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasProjects, setHasProjects] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY)
    if (completed === TOUR_VERSION) return

    const timer = setTimeout(() => {
      const projectCards = document.querySelectorAll(
        '[data-tour="project-card"]'
      )
      setHasProjects(projectCards.length > 0)
      setIsOpen(true)
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  const steps = useMemo(
    () => STEPS.filter((step) => !(step.id === "pipeline" && hasProjects)),
    [hasProjects]
  )

  const currentStep = steps[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === steps.length - 1

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, TOUR_VERSION)
    setIsOpen(false)
  }, [])

  const next = useCallback(() => {
    if (isLast) {
      completeTour()
    } else {
      setCurrentIndex((i) => Math.min(i + 1, steps.length - 1))
    }
  }, [completeTour, isLast, steps.length])

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  const skip = useCallback(() => {
    completeTour()
  }, [completeTour])

  const restart = useCallback(() => {
    localStorage.removeItem(TOUR_KEY)
    setCurrentIndex(0)
    setIsOpen(true)
  }, [])

  useEffect(() => {
    setTourRestarter(restart)
  }, [restart])

  const value = useMemo(
    () => ({
      isOpen,
      currentStep,
      currentIndex,
      totalSteps: steps.length,
      isFirst,
      isLast,
      next,
      prev,
      skip,
      restart,
    }),
    [
      isOpen,
      currentStep,
      currentIndex,
      steps.length,
      isFirst,
      isLast,
      next,
      prev,
      skip,
      restart,
    ]
  )

  return <TourContext value={value}>{children}</TourContext>
}

export function useTour() {
  const ctx = use(TourContext)
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider")
  }
  return ctx
}