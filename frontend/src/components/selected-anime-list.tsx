import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	MusicNote01Icon,
} from "@hugeicons/core-free-icons";
import { animeDisplayTitle, type AnimePick } from "@/lib/anime-pick";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SelectedAnimeListProps = {
	animes: AnimePick[];
	onRemove: (malId: number) => void;
	className?: string;
};

export function SelectedAnimeList({
	animes,
	onRemove,
	className,
}: SelectedAnimeListProps) {
	if (animes.length === 0) {
		return (
			<div
				className={cn(
					"rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-5 text-center",
					className,
				)}
			>
				<p className="text-sm text-muted-foreground">No anime selected yet</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Search above or use bulk import. Selected shows stay listed here.
				</p>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex items-baseline justify-between gap-2">
				<p className="text-sm font-medium">
					Selected anime
					<span className="ml-1.5 tabular-nums text-muted-foreground">
						({animes.length})
					</span>
				</p>
				<p className="text-xs text-muted-foreground">
					Stays visible while you search or import more
				</p>
			</div>
			<ul className="flex flex-wrap gap-2">
				{animes.map((anime) => (
					<li key={anime.mal_id}>
							<div className="flex max-w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.04] py-1 pl-1 pr-1.5 ring-1 ring-primary/10">
								<div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted/40">
									{anime.image_url ? (
										<img
											src={anime.image_url}
											alt=""
											className="size-full object-cover"
											loading="lazy"
										/>
									) : (
										<div className="flex size-full items-center justify-center">
											<HugeiconsIcon
												icon={MusicNote01Icon}
												strokeWidth={1.5}
												className="size-4 text-muted-foreground/50"
											/>
										</div>
									)}
								</div>
								<div className="min-w-0 max-w-[11rem]">
									<p className="truncate text-xs font-semibold leading-tight">
										{animeDisplayTitle(anime)}
									</p>
									{anime.year ? (
										<p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
											{anime.year}
										</p>
									) : null}
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									className="shrink-0 text-muted-foreground hover:text-foreground"
									aria-label={`Remove ${animeDisplayTitle(anime)}`}
									onClick={() => onRemove(anime.mal_id)}
								>
									<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
								</Button>
							</div>
						</li>
				))}
			</ul>
		</div>
	);
}
