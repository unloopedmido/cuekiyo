import {
	CheckCircle2,
	Circle,
	CircleAlert,
	Loader2,
	Minus,
	XCircle,
	type LucideIcon,
} from "lucide-react";
import type { ProjectStatus } from "../types";
import { getStatusCopy, type StatusTone } from "../pipeline";

const TONE_CLASSES: Record<StatusTone, string> = {
	idle: "border-white/12 bg-white/[0.06] text-soft",
	running: "border-lime/40 bg-lime/10 text-lime",
	attention: "border-warning/35 bg-warning/10 text-warning",
	success: "border-success/35 bg-success/10 text-success",
	danger: "border-danger/35 bg-danger/10 text-danger",
	muted: "border-white/10 bg-white/[0.04] text-muted",
};

const TONE_ICONS: Record<StatusTone, LucideIcon> = {
	running: Loader2,
	attention: CircleAlert,
	success: CheckCircle2,
	danger: XCircle,
	idle: Circle,
	muted: Minus,
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
	const copy = getStatusCopy(status);
	const Icon = TONE_ICONS[copy.tone];

	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[copy.tone]}`}
		>
			<Icon
				size={12}
				className={copy.tone === "running" ? "animate-spin" : undefined}
				aria-hidden="true"
			/>
			{copy.label}
		</span>
	);
}
