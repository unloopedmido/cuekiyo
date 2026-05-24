import { Link } from "react-router-dom";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
	className?: string;
	variant?: "full" | "mark";
};

export function BrandWordmark({
	className,
	variant = "full",
}: BrandWordmarkProps) {
	if (variant === "mark") {
		return (
			<Link
				to="/"
				aria-label={`${BRAND.name} home`}
				className={cn(
					"flex size-9 items-center justify-center rounded-md font-sans text-sm font-bold tracking-tight text-primary transition-opacity hover:opacity-85",
					className,
				)}
			>
				{BRAND.mark}
			</Link>
		);
	}

	return (
		<Link
			to="/"
			aria-label={`${BRAND.name} home`}
			className={cn(
				"inline-flex min-w-0 items-baseline gap-px font-sans text-lg font-semibold tracking-tight transition-opacity hover:opacity-90",
				className,
			)}
		>
			<span className="font-bold text-primary">{BRAND.wordmark.primary}</span>
			<span className="text-foreground">{BRAND.wordmark.secondary}</span>
		</Link>
	);
}
