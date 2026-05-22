import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
	title,
	description,
	meta,
	actions,
	className,
}: {
	title: string;
	description?: string;
	meta?: ReactNode;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between fcr-animate-up",
				className,
			)}
		>
			<div className="flex max-w-2xl flex-col gap-1.5">
				<h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
					{title}
				</h1>
				{description && (
					<p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
						{description}
					</p>
				)}
				{meta}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}
