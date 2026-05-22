import { useCallback, useEffect } from "react";

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutDef {
	key: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
	alt?: boolean;
	allowInInputs?: boolean;
	description: string;
	handler: ShortcutHandler;
}

const globalRegistry: ShortcutDef[] = [];
let listenerCount = 0;

function isInputElement(element: Element | null): boolean {
	if (!element) return false;
	const tag = element.tagName.toLowerCase();
	if (tag === "input") {
		const type = (element as HTMLInputElement).type.toLowerCase();
		return (
			type !== "checkbox" &&
			type !== "radio" &&
			type !== "button" &&
			type !== "submit" &&
			type !== "reset"
		);
	}
	return (
		tag === "textarea" ||
		tag === "select" ||
		element.getAttribute("contenteditable") === "true"
	);
}

function normalizeKey(event: KeyboardEvent): string {
	const key = event.key?.toLowerCase();
	if (!key) return "";
	if (key === "escape") return "esc";
	if (key === " ") return "space";
	if (key === "arrowup") return "up";
	if (key === "arrowdown") return "down";
	if (key === "arrowleft") return "left";
	if (key === "arrowright") return "right";
	return key;
}

export function matchShortcut(event: KeyboardEvent, def: ShortcutDef): boolean {
	const key = normalizeKey(event);
	if (!key || key !== def.key.toLowerCase()) return false;
	if (def.ctrl && !event.ctrlKey) return false;
	if (def.meta && !event.metaKey) return false;
	if (def.shift && !event.shiftKey) return false;
	if (def.alt && !event.altKey) return false;
	if (
		key.length === 1 &&
		!def.allowInInputs &&
		isInputElement(document.activeElement)
	)
		return false;
	return true;
}

function keydownListener(event: KeyboardEvent) {
	for (const def of globalRegistry.slice().reverse()) {
		if (matchShortcut(event, def)) {
			event.preventDefault();
			def.handler(event);
			return;
		}
	}
}

export function useShortcutsRegistry() {
	const register = useCallback((defs: ShortcutDef[]) => {
		globalRegistry.push(...defs);
		return () => {
			for (const d of defs) {
				const idx = globalRegistry.indexOf(d);
				if (idx !== -1) globalRegistry.splice(idx, 1);
			}
		};
	}, []);

	useEffect(() => {
		if (listenerCount === 0) {
			document.addEventListener("keydown", keydownListener);
		}
		listenerCount++;
		return () => {
			listenerCount--;
			if (listenerCount === 0) {
				document.removeEventListener("keydown", keydownListener);
			}
		};
	}, []);

	return { register };
}

export function formatShortcut(
	def: Pick<ShortcutDef, "ctrl" | "meta" | "shift" | "alt" | "key">,
): string {
	const parts: string[] = [];
	const isMac = navigator.platform.toLowerCase().includes("mac");
	if (def.meta) parts.push(isMac ? "⌘" : "Win");
	if (def.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
	if (def.alt) parts.push(isMac ? "⌥" : "Alt");
	if (def.shift) parts.push("⇧");
	if (def.key.length === 1) parts.push(def.key.toUpperCase());
	else if (def.key === "esc") parts.push("Esc");
	else parts.push(def.key);
	return parts.join(" ");
}
