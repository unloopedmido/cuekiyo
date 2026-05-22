import { useEffect } from "react";
import {
	FolderKanban,
	Keyboard,
	Plus,
	Settings,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import GlobalHotkeys from "./GlobalHotkeys";
import { openCommandPalette } from "./CommandPalette";

const navItems = [
	{ to: "/", label: "Projects", icon: FolderKanban, end: true },
	{ to: "/projects/new", label: "New project", icon: Plus },
	{ to: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell() {
	const location = useLocation();

	useEffect(() => {
		const path = location.pathname;
		if (path === "/") {
			document.title = "Projects — MV Pipeline";
		} else if (path === "/projects/new") {
			document.title = "New project — MV Pipeline";
		} else if (path === "/settings") {
			document.title = "Settings — MV Pipeline";
		} else if (path.startsWith("/projects/")) {
			document.title = "Project — MV Pipeline";
		} else {
			document.title = "MV Pipeline";
		}
	}, [location.pathname]);

	return (
		<GlobalHotkeys>
			<div className="min-h-screen bg-studio text-soft">
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:text-studio"
				>
					Skip to content
				</a>
				<aside className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/10 bg-panel/90 p-2 shadow-studio backdrop-blur-xl md:inset-y-4 md:left-4 md:right-auto md:flex md:w-64 md:flex-col md:p-4">
					<div className="mb-5 hidden md:block px-1">
						<p className="text-[15px] font-semibold tracking-tight">
							<span className="text-soft">mv</span>
							<span className="text-lime">pipe</span>
						</p>
					</div>
					<nav className="grid grid-cols-3 gap-1 md:grid-cols-1">
						{navItems.map(({ to, label, icon: Icon, end }) => (
							<NavLink
								key={to}
								to={to}
								end={end}
								aria-label={label}
								className={({ isActive }) =>
									[
										"flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm md:justify-start",
										isActive
											? "bg-lime/[0.12] font-medium text-lime"
											: "text-muted hover:bg-white/[0.06] hover:text-soft",
									].join(" ")
								}
							>
								<Icon size={17} aria-hidden="true" />
								<span className="hidden sm:inline">{label}</span>
							</NavLink>
						))}
					</nav>
					<div className="mt-auto hidden md:block border-t border-white/[0.08] pt-3">
						<button
							onClick={openCommandPalette}
							className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-muted hover:bg-white/[0.06] hover:text-soft"
							aria-label="Open command palette"
						>
							<Keyboard size={17} aria-hidden="true" />
							<span className="min-w-0 flex-1 truncate text-sm">
								Command palette
							</span>
							<span className="ml-auto font-mono text-[10px] text-muted/50">
								{navigator.platform.toLowerCase().includes("mac")
									? "⌘K"
									: "Ctrl+K"}
							</span>
						</button>
					</div>
				</aside>
				<main
					id="main-content"
					tabIndex={-1}
					className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 md:mx-0 md:max-w-none md:pl-80 md:pr-8 md:pt-8 md:pb-8"
				>
					<Outlet />
				</main>
			</div>
		</GlobalHotkeys>
	);
}
