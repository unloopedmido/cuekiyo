import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useShortcutsRegistry } from "@/hooks/useKeyboardShortcuts";
import {
	CommandPalette,
	openCommandPalette,
} from "@/components/command-palette";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";

export function GlobalHotkeys({ children }: { children: React.ReactNode }) {
	const navigate = useNavigate();
	const { register } = useShortcutsRegistry();

	const mod = navigator.platform.toLowerCase().includes("mac")
		? "meta"
		: "ctrl";

	useEffect(() => {
		const defs = [
			{
				...(mod === "meta" ? { meta: true } : { ctrl: true }),
				key: "k",
				description: "Open command palette",
				allowInInputs: true,
				handler: () => openCommandPalette(),
			},
			{
				[mod]: true,
				shift: true,
				key: "d",
				description: "Go to projects",
				handler: () => navigate("/"),
			},
			{
				[mod]: true,
				shift: true,
				key: "n",
				description: "New compilation",
				handler: () => navigate("/projects/new"),
			},
			{
				[mod]: true,
				shift: true,
				key: "s",
				description: "Go to Settings",
				handler: () => navigate("/settings"),
			},
			{
				[mod]: true,
				shift: true,
				key: "p",
				description: "Go to current project",
				handler: () => {
					const m = window.location.pathname.match(/\/projects\/([^/]+)/);
					if (m) navigate(`/projects/${m[1]}`);
				},
			},
		];
		return register(defs as Parameters<typeof register>[0]);
	}, [register, navigate]);

	return (
		<>
			{children}
			<CommandPalette />
			<KeyboardShortcutsHelp />
		</>
	);
}
