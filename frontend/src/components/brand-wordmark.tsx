import { Link } from "react-router-dom";
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
				aria-label="MV Pipeline home"
				className={cn(
					"flex size-9 items-center justify-center rounded-md font-sans text-base font-bold tracking-tight text-primary transition-opacity hover:opacity-85",
					className,
				)}
			>
				mv
			</Link>
		);
	}

	return (
		<Link
			to="/"
			aria-label="MV Pipeline home"
			className={cn(
				"inline-flex min-w-0 items-baseline gap-px font-sans text-lg font-semibold tracking-tight transition-opacity hover:opacity-90",
				className,
			)}
		>
			<span className="font-bold text-primary">mv</span>
			<span className="text-foreground">pipeline</span>
		</Link>
	);
}
