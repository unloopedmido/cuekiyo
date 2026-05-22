import { Badge } from "@/components/ui/badge";
import { getStatusCopy, type StatusTone } from "@/pipeline";
import type { ProjectStatus } from "@/types";

function toneVariant(tone: StatusTone): "default" | "secondary" | "destructive" | "outline" {
	switch (tone) {
		case "danger":
			return "destructive";
		case "attention":
			return "outline";
		case "success":
		case "running":
			return "default";
		default:
			return "secondary";
	}
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
	const copy = getStatusCopy(status);
	return <Badge variant={toneVariant(copy.tone)}>{copy.label}</Badge>;
}
