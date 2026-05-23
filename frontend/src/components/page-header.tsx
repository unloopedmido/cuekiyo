import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
	title,
	description,
	meta,
	actions,
	leading,
	titleViewTransitionName,
	className,
}: {
	title: string;
	description?: string;
	meta?: ReactNode;
	actions?: ReactNode;
	leading?: ReactNode;
	titleViewTransitionName?: string;
	className?: string;
}) {
	const titleStyle: CSSProperties | undefined = titleViewTransitionName
		? { viewTransitionName: titleViewTransitionName }
		: undefined;

	return (
		<div
			className={cn(
				"flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between fcr-animate-up",
				className,
			)}
		>
			<div className="flex min-w-0 max-w-2xl gap-4">
				{leading}
				<div className="flex min-w-0 flex-col gap-1.5">
				<h1
					className="font-heading text-3xl font-semibold tracking-tight md:text-4xl"
					style={titleStyle}
				>
					{title}
				</h1>
				{description && (
					<p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
						{description}
					</p>
				)}
				{meta}
				</div>
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}
