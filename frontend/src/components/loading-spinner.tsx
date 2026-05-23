import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export function LoadingSpinner({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      role="status"
      className={cn("inline-flex", className)}
      {...props}
    >
      <span className="sr-only">Loading…</span>
      <HugeiconsIcon
        icon={Loading03Icon}
        strokeWidth={2}
        aria-hidden
        className="animate-spin"
      />
    </span>
  )
}
