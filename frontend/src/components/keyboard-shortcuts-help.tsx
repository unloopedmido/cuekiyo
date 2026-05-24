import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { formatShortcut } from "@/hooks/useKeyboardShortcuts";

const isMac = () => navigator.platform.toLowerCase().includes("mac");

const shortcuts = () => {
	const mac = isMac();
	return [
		{
			...(mac ? { meta: true } : { ctrl: true }),
			key: "k",
			description: "Open command palette",
		},
		{
			...(mac ? { meta: true } : { ctrl: true }),
			shift: true,
			key: "d",
			description: "Go to projects",
		},
		{
			...(mac ? { meta: true } : { ctrl: true }),
			shift: true,
			key: "n",
			description: "New compilation",
		},
		{
			...(mac ? { meta: true } : { ctrl: true }),
			shift: true,
			key: "s",
			description: "Settings",
		},
		{
			...(mac ? { meta: true } : { ctrl: true }),
			shift: true,
			key: "p",
			description: "Current compilation",
		},
		{ key: "?", description: "Show keyboard shortcuts" },
		{ key: "t", description: "Restart tour" },
	];
};

export function KeyboardShortcutsHelp() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
				const tag = (document.activeElement?.tagName ?? "").toLowerCase();
				if (tag !== "input" && tag !== "textarea") {
					e.preventDefault();
					setOpen(true);
				}
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
					<DialogDescription>
						{isMac() ? "macOS" : "Windows/Linux"} shortcuts for quick navigation.
					</DialogDescription>
				</DialogHeader>
				<ul className="flex flex-col gap-2 text-sm">
					{shortcuts().map((s) => (
						<li
							key={s.description}
							className="flex items-center justify-between gap-4"
						>
							<span className="text-muted-foreground">{s.description}</span>
							<kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
								{formatShortcut(s)}
							</kbd>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
