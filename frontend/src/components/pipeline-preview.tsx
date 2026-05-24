import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Download01Icon,
  MusicNote01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

const STEPS = [
  { icon: Add01Icon, label: "Pick anime" },
  { icon: MusicNote01Icon, label: "Choose songs" },
  { icon: Search01Icon, label: "Review clips" },
  { icon: Download01Icon, label: "Get video" },
]

export function PipelinePreview() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={
                  isLast
                    ? "flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary ring-2 ring-primary/20"
                    : "flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
                }
              >
                <HugeiconsIcon icon={step.icon} strokeWidth={1.5} className="size-4" />
              </div>
              {!isLast && (
                <span className="h-px w-4 bg-border" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-6">
        {STEPS.map((step) => (
          <span
            key={step.label}
            className="text-[11px] font-medium text-muted-foreground"
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}
