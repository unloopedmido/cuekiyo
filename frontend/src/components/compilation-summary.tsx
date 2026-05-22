import { formatEncoder, formatSongType } from "@/lib/nav";
import type { Project } from "@/types";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function MetaDot() {
	return (
		<span aria-hidden className="text-muted-foreground/50">
			·
		</span>
	);
}

export function CompilationSummary({ project }: { project: Project }) {
	const songTypes = project.song_types.map(formatSongType).join(", ");
	const showCount = project.animes.length;
	const primaryShow = project.animes[0]?.anime_name;
	const moreShows = showCount - 1;

	const showsLabel =
		showCount === 0
			? "No shows"
			: showCount === 1
				? primaryShow
				: moreShows === 1
					? `${primaryShow} +1 more`
					: `${primaryShow} +${moreShows} more`;

	return (
		<p className="flex max-w-prose flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
			{showCount > 0 ? (
				<HoverCard openDelay={200} closeDelay={100}>
					<HoverCardTrigger asChild>
						<button
							type="button"
							className="max-w-[14rem] truncate text-left underline-offset-2 hover:text-foreground hover:underline sm:max-w-xs"
						>
							{showsLabel}
						</button>
					</HoverCardTrigger>
					<HoverCardContent align="start" className="w-72 p-3">
						<p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							Shows
						</p>
						<ul className="flex flex-col gap-1">
							{project.animes.map((anime) => (
								<li
									key={anime.anime_mal_id}
									className="text-xs leading-snug text-foreground"
								>
									{anime.anime_name}
								</li>
							))}
						</ul>
						<Separator className="my-2.5 bg-border/60" />
						<dl className="grid gap-1 text-xs text-muted-foreground">
							<div className="flex justify-between gap-3">
								<dt>Song types</dt>
								<dd className="text-foreground">{songTypes}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>Songs</dt>
								<dd className="text-foreground">{project.songs_count}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>Clip length</dt>
								<dd className="text-foreground">{project.clip_time}s</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>Encoder</dt>
								<dd className="text-right text-foreground">
									{formatEncoder(project.encoder)}
								</dd>
							</div>
						</dl>
					</HoverCardContent>
				</HoverCard>
			) : (
				<span>{showsLabel}</span>
			)}
			<MetaDot />
			<span>{songTypes}</span>
			<MetaDot />
			<span>
				{project.songs_count} song{project.songs_count === 1 ? "" : "s"}
			</span>
			<MetaDot />
			<span className={cn(showCount === 0 && "sr-only")}>{project.clip_time}s clips</span>
		</p>
	);
}
