import { HugeiconsIcon } from "@hugeicons/react"
import {
  MinusSignIcon,
  MusicNote01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { FieldDescription } from "@/components/ui/field"
import { cn } from "@/lib/utils"

type SongCountSettingsProps = {
  unlimited: boolean
  onUnlimitedChange: (unlimited: boolean) => void
  count: number
  onCountChange: (count: number) => void
  min?: number
  max?: number
}

export function SongCountSettings({
  unlimited,
  onUnlimitedChange,
  count,
  onCountChange,
  min = 1,
  max = 50,
}: SongCountSettingsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={MusicNote01Icon}
          strokeWidth={1.5}
          className="size-4 text-muted-foreground"
        />
        <span className="text-sm font-medium">Song selection</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={unlimited}
          aria-label="Pick as many songs as you want"
          onClick={() => onUnlimitedChange(true)}
          className={cn(
            "flex flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            unlimited
              ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
              : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50",
          )}
        >
          <span className="text-xs font-semibold">Pick freely</span>
          <span className="text-[10px] leading-relaxed text-muted-foreground">
            Choose any number of themes during song selection. No cap.
          </span>
        </button>
        <button
          type="button"
          aria-pressed={!unlimited}
          aria-label="Set a specific song count"
          onClick={() => onUnlimitedChange(false)}
          className={cn(
            "flex flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !unlimited
              ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
              : "border-border/60 bg-card/30 hover:border-border hover:bg-card/50",
          )}
        >
          <span className="text-xs font-semibold">Exact count</span>
          <span className="text-[10px] leading-relaxed text-muted-foreground">
            Require a specific number of songs before continuing.
          </span>
        </button>
      </div>

      {!unlimited ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            How many songs?
          </span>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border/60 bg-card/30 p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-md"
              disabled={count <= min}
              aria-label="Fewer songs"
              onClick={() => onCountChange(Math.max(min, count - 1))}
            >
              <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-4" />
            </Button>
            <span
              className="min-w-10 text-center tabular-nums text-lg font-semibold"
              aria-live="polite"
            >
              {count}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-md"
              disabled={count >= max}
              aria-label="More songs"
              onClick={() => onCountChange(Math.min(max, count + 1))}
            >
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <FieldDescription>
        {unlimited
          ? "During song selection you can pick every theme you want."
          : "You must select exactly this many songs to continue."}
      </FieldDescription>
    </div>
  )
}
