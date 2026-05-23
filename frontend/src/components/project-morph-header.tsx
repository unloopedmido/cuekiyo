import type { CSSProperties, ReactNode } from "react"
import { PageHeader } from "@/components/page-header"
import { ProjectThumbnail } from "@/components/project-thumbnail"
import { projectVtName } from "@/lib/view-transitions"
import type { Project } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"

type ProjectMorphHeaderProps = {
  projectId: string
  title: string
  animes?: Project["animes"]
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}

function MorphThumbnail({
  projectId,
  animes,
}: {
  projectId: string
  animes: Project["animes"]
}) {
  const style: CSSProperties = {
    viewTransitionName: projectVtName("thumb", projectId),
  }

  return (
    <div className="shrink-0 self-start" style={style}>
      <ProjectThumbnail animes={animes} className="size-20 sm:size-24" />
    </div>
  )
}

export function ProjectMorphHeader({
  projectId,
  title,
  animes = [],
  description,
  meta,
  actions,
}: ProjectMorphHeaderProps) {
  return (
    <PageHeader
      title={title}
      titleViewTransitionName={projectVtName("title", projectId)}
      description={description}
      meta={meta}
      actions={actions}
      leading={
        animes.length > 0 ? (
          <MorphThumbnail projectId={projectId} animes={animes} />
        ) : (
          <Skeleton
            className="size-20 shrink-0 rounded-lg sm:size-24"
            style={{
              viewTransitionName: projectVtName("thumb", projectId),
            }}
          />
        )
      }
      className="fcr-animate-up"
    />
  )
}
