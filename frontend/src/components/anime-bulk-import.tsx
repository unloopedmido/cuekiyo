import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/api";
import { errorToMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FieldDescription } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/loading-spinner";

type AnimePick = {
	mal_id: number;
	title: string;
	title_english?: string;
	image_url?: string;
	year?: number;
};

export function AnimeBulkImport({
	existingIds,
	onImport,
}: {
	existingIds: Set<number>;
	onImport: (animes: AnimePick[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const [importing, setImporting] = useState(false);
	const [lastResult, setLastResult] = useState<{
		added: number;
		skipped: number;
	} | null>(null);

	const handleImport = async () => {
		const trimmed = text.trim();
		if (!trimmed) {
			toast.error("Paste at least one MAL or AniList URL or ID");
			return;
		}
		setImporting(true);
		setLastResult(null);
		try {
			const { resolved, skipped } = await api.resolveAnimeList(trimmed);
			const fresh = resolved.filter((item) => !existingIds.has(item.mal_id));
			const duplicateCount = resolved.length - fresh.length;
			if (fresh.length > 0) {
				onImport(fresh);
			}
			setLastResult({
				added: fresh.length,
				skipped: skipped + duplicateCount,
			});
			if (fresh.length > 0) {
				toast.success(
					`Added ${fresh.length} anime${fresh.length === 1 ? "" : ""}`,
				);
			} else {
				toast.info("No new anime to add");
			}
			setText("");
		} catch (e) {
			toast.error(errorToMessage(e));
		} finally {
			setImporting(false);
		}
	};

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<Button type="button" variant="outline" size="sm" className="gap-2">
					<HugeiconsIcon
						icon={ArrowDown01Icon}
						strokeWidth={2}
						data-icon="inline-start"
						className={open ? "rotate-180 transition-transform" : "transition-transform"}
					/>
					Bulk add anime
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="mt-3 flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 p-4">
				<FieldDescription>
					Paste MAL or AniList URLs or numeric IDs, one per line. Commas and
					spaces also work.
				</FieldDescription>
				<Textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder={`https://myanimelist.net/anime/5114/Fullmetal-Alchemist-Brotherhood\n9253\nhttps://anilist.co/anime/101922`}
					rows={5}
					className="font-mono text-xs"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						size="sm"
						onClick={() => void handleImport()}
						disabled={importing}
					>
						{importing ? <LoadingSpinner data-icon="inline-start" /> : null}
						Import list
					</Button>
					{lastResult ? (
						<p className="text-xs text-muted-foreground">
							{lastResult.added} added
							{lastResult.skipped > 0
								? ` · ${lastResult.skipped} skipped`
								: null}
						</p>
					) : null}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
