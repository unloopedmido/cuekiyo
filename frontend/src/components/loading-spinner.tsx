import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function LoadingSpinner({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span role="status" aria-label="Loading" className={cn("inline-flex", className)} {...props}>
			<HugeiconsIcon
				icon={Loading03Icon}
				strokeWidth={2}
				className="animate-spin"
			/>
		</span>
	);
}
