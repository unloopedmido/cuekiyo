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

function toneExtra(tone: StatusTone): string {
	switch (tone) {
		case "running":
			return "shadow-[0_0_8px_oklch(0.768_0.233_130.85/0.2)]";
		case "attention":
			return "shadow-[0_0_8px_oklch(0.577_0.245_27.325/0.15)]";
		default:
			return "";
	}
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
	const copy = getStatusCopy(status);
	return <Badge variant={toneVariant(copy.tone)} className={toneExtra(copy.tone)}>{copy.label}</Badge>;
}
