import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { useTour } from "@/hooks/useTour"
import { cn } from "@/lib/utils"

type Rect = {
  top: number
  left: number
  width: number
  height: number
}

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const { top, left, width, height } = el.getBoundingClientRect()
  return { top, left, width, height }
}

function computeTooltipPosition(
  target: Rect,
  placement: "top" | "bottom" | "left" | "right",
  tooltipWidth: number,
  tooltipHeight: number
): { top: number; left: number } {
  const gap = 10
  switch (placement) {
    case "top":
      return {
        top: target.top - tooltipHeight - gap,
        left: Math.max(
          12,
          Math.min(
            target.left + target.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 12
          )
        ),
      }
    case "bottom":
      return {
        top: target.top + target.height + gap,
        left: Math.max(
          12,
          Math.min(
            target.left + target.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 12
          )
        ),
      }
    case "left":
      return {
        top: Math.max(
          12,
          Math.min(
            target.top + target.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - 12
          )
        ),
        left: Math.max(12, target.left - tooltipWidth - gap),
      }
    case "right":
      return {
        top: Math.max(
          12,
          Math.min(
            target.top + target.height / 2 - tooltipHeight / 2,
            window.innerHeight - tooltipHeight - 12
          )
        ),
        left: Math.min(
          target.left + target.width + gap,
          window.innerWidth - tooltipWidth - 12
        ),
      }
  }
}

function TourProgress({
  current,
  total,
}: {
  current: number
  total: number
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-200",
            i === current
              ? "w-4 bg-primary"
              : "w-1 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  )
}

function SpotlightRing({ rect }: { rect: Rect }) {
  return (
    <div
      className="pointer-events-none fixed z-[66] rounded-xl border-2 border-primary/25 fcr-glow-primary-sm"
      style={{
        top: rect.top - 5,
        left: rect.left - 5,
        width: rect.width + 10,
        height: rect.height + 10,
        transition:
          "top 200ms cubic-bezier(0.16, 1, 0.3, 1), left 200ms cubic-bezier(0.16, 1, 0.3, 1), width 200ms cubic-bezier(0.16, 1, 0.3, 1), height 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    />
  )
}

function TourOverlay({ targetRect }: { targetRect: Rect | null }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <filter id="tour-spotlight-soft">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <mask id="tour-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {targetRect ? (
            <rect
              x={targetRect.left - 10}
              y={targetRect.top - 10}
              width={targetRect.width + 20}
              height={targetRect.height + 20}
              rx={14}
              fill="black"
              filter="url(#tour-spotlight-soft)"
            />
          ) : null}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="oklch(from var(--foreground) l c h / 0.3)"
        mask="url(#tour-mask)"
      />
    </svg>
  )
}

function TourCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border bg-popover p-5 shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
}

function TourActions({
  isFirst,
  isLast,
  onPrev,
  onSkip,
  onNext,
  ctaRef,
}: {
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onSkip: () => void
  onNext: () => void
  ctaRef: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {isFirst ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={onPrev}>
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Back
        </Button>
      )}
      <Button
        ref={ctaRef}
        type="button"
        size="sm"
        onClick={onNext}
        className="fcr-glow-primary-xs"
      >
        {isLast ? "Get started" : "Next"}
        {!isLast && (
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            data-icon="inline-end"
          />
        )}
      </Button>
    </div>
  )
}

export function TourGuide() {
  const {
    isOpen,
    currentStep,
    currentIndex,
    totalSteps,
    isFirst,
    isLast,
    next,
    prev,
    skip,
  } = useTour()

  const tooltipRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [showEntrance, setShowEntrance] = useState(false)
  const skippedMissing = useRef(new Set<string>())
  const rafRef = useRef<number>(0)

  // Entrance animation: only on first open, not on every step change.
  // After ~450ms the tour has "settled" and only position transitions apply.
  useEffect(() => {
    if (!isOpen) {
      skippedMissing.current.clear()
      return
    }
    skippedMissing.current.clear()
    let cancelled = false
    const showTimer = setTimeout(() => {
      if (!cancelled) setShowEntrance(true)
    }, 0)
    const hideTimer = setTimeout(() => {
      if (!cancelled) setShowEntrance(false)
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [isOpen])

  // Keyboard: Escape to dismiss, Tab trap within tour card
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        skip()
        return
      }

      if (e.key === "Tab") {
        const card = document.querySelector<HTMLElement>("[data-tour-card]")
        if (!card) return
        const focusable = card.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, skip])

  // Auto-skip steps whose target element is missing from the DOM
  useEffect(() => {
    if (!isOpen || !currentStep?.target) return
    if (skippedMissing.current.has(currentStep.id)) return
    const rect = getTargetRect(currentStep.target)
    if (!rect) {
      skippedMissing.current.add(currentStep.id)
      if (!isLast) next()
      else skip()
    }
  }, [isOpen, currentStep, isLast, next, skip])

  // Focus CTA button on each step
  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => {
      ctaRef.current?.focus()
    })
  }, [isOpen, currentIndex])

  // Position calculation (resize + scroll aware, rAF-throttled)
  useLayoutEffect(() => {
    if (!isOpen || !currentStep?.target) return

    const updatePosition = () => {
      const rect = getTargetRect(currentStep.target!)
      if (!rect) return
      const tw = tooltipRef.current?.offsetWidth ?? 280
      const th = tooltipRef.current?.offsetHeight ?? 120
      setPosition(
        computeTooltipPosition(
          rect,
          currentStep.placement ?? "bottom",
          tw,
          th
        )
      )
    }

    updatePosition()

    const handleUpdate = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePosition)
    }

    window.addEventListener("resize", handleUpdate)
    window.addEventListener("scroll", handleUpdate, true)
    return () => {
      window.removeEventListener("resize", handleUpdate)
      window.removeEventListener("scroll", handleUpdate, true)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isOpen, currentStep])

  if (!isOpen || !currentStep) return null

  const targetRect = currentStep.target
    ? getTargetRect(currentStep.target)
    : null
  const isModalStep = !currentStep.target
  const entranceClass = showEntrance
    ? isModalStep
      ? "fcr-animate-scale"
      : "fcr-animate-up"
    : ""

  return createPortal(
    <div
      className="fixed inset-0 z-[65]"
      role="dialog"
      aria-modal="true"
      aria-label="Getting started"
    >
      <TourOverlay targetRect={targetRect} />

      {targetRect ? <SpotlightRing rect={targetRect} /> : null}

      {isModalStep ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <TourCard
            className={cn("max-w-sm", entranceClass)}
            data-tour-card
          >
            <div className="flex flex-col gap-4">
              <div className="space-y-2.5">
                <TourProgress current={currentIndex} total={totalSteps} />
                <h2
                  id="tour-modal-title"
                  className="font-heading text-lg font-semibold tracking-tight"
                >
                  {currentStep.title}
                </h2>
                <p
                  id="tour-modal-desc"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {currentStep.description}
                </p>
              </div>
              <TourActions
                isFirst={isFirst}
                isLast={isLast}
                onPrev={prev}
                onSkip={skip}
                onNext={next}
                ctaRef={ctaRef}
              />
            </div>
          </TourCard>
        </div>
      ) : (
        <div
          ref={tooltipRef}
          className={cn(
            "pointer-events-auto fixed z-[70] w-[min(100vw-1.5rem,18rem)] rounded-xl border border-border bg-popover p-4 shadow-lg",
            entranceClass
          )}
          style={{
            top: position.top,
            left: position.left,
            transition:
              "top 200ms cubic-bezier(0.16, 1, 0.3, 1), left 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          data-tour-card
          role="document"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-description"
        >
          <div className="flex flex-col gap-3">
            <TourProgress current={currentIndex} total={totalSteps} />
            <div className="space-y-1.5">
              <h3
                id="tour-step-title"
                className="font-heading text-sm font-semibold"
              >
                {currentStep.title}
              </h3>
              <p
                id="tour-step-description"
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {currentStep.description}
              </p>
            </div>
            <TourActions
              isFirst={isFirst}
              isLast={isLast}
              onPrev={prev}
              onSkip={skip}
              onNext={next}
              ctaRef={ctaRef}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}