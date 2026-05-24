import { HugeiconsIcon } from "@hugeicons/react"
import { Folder01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type ProjectAnime = {
  image_url?: string | null
}

type ProjectThumbnailProps = {
  animes: ProjectAnime[]
  className?: string
}

function CoverImage({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cn("size-full object-cover", className)}
    />
  )
}

export function ProjectThumbnail({ animes, className }: ProjectThumbnailProps) {
  const covers = animes
    .map((a) => a.image_url)
    .filter((url): url is string => Boolean(url))

  if (covers.length === 0) {
    return (
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground sm:size-20",
          className
        )}
      >
        <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} className="size-6" />
      </div>
    )
  }

  if (covers.length === 1) {
    return (
      <div
        className={cn(
          "size-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20 sm:size-20",
          className
        )}
      >
        <CoverImage src={covers[0]} />
      </div>
    )
  }

  if (covers.length === 2) {
    return (
      <div
        className={cn(
          "grid size-16 shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-border/60 bg-muted/20 sm:size-20",
          className
        )}
      >
        {covers.map((src) => (
          <CoverImage key={src} src={src} />
        ))}
      </div>
    )
  }

  if (covers.length === 3) {
    return (
      <div
        className={cn(
          "grid size-16 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border border-border/60 bg-muted/20 sm:size-20",
          className
        )}
      >
        <CoverImage src={covers[0]} className="row-span-2" />
        <CoverImage src={covers[1]} />
        <CoverImage src={covers[2]} />
      </div>
    )
  }

  const visible = covers.slice(0, 4)
  const extra = covers.length - visible.length

  return (
    <div
      className={cn(
        "relative grid size-16 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border border-border/60 bg-muted/20 sm:size-20",
        className
      )}
    >
      {visible.map((src, index) => (
        <div key={src} className="relative size-full">
          <CoverImage src={src} />
          {extra > 0 && index === visible.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-semibold text-foreground tabular-nums">
              +{extra}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
