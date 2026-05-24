import { parseYoutubeId } from "@/lib/youtube-url";
import { youtubeEmbedUrl } from "@/lib/youtube-embed";

export function YoutubePreview({
	youtubeId,
	title,
	startSeconds,
}: {
	youtubeId: string;
	title: string;
	startSeconds?: number;
}) {
	const id = parseYoutubeId(youtubeId) ?? youtubeId;
	return (
		<div className="aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border/80 bg-muted/20">
			<iframe
				title={title}
				src={youtubeEmbedUrl(id, startSeconds)}
				className="size-full"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				loading="lazy"
				referrerPolicy="strict-origin-when-cross-origin"
			/>
		</div>
	);
}
