import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalHotkeys } from "@/components/global-hotkeys";
import { PageMetaProvider, usePageMetaContext } from "@/context/page-meta";
import { NAV } from "@/lib/nav";

function useDocumentTitle() {
	const { pathname } = useLocation();
	const { meta } = usePageMetaContext();

	useEffect(() => {
		let title = "MV Pipeline";
		if (meta.documentTitle) {
			title = `${meta.documentTitle} — MV Pipeline`;
		} else if (pathname === "/") {
			title = `${NAV.projects} — MV Pipeline`;
		} else if (pathname === "/projects/new") {
			title = `${NAV.newCompilation} — MV Pipeline`;
		} else if (pathname === "/settings") {
			title = `${NAV.settings} — MV Pipeline`;
		}
		document.title = title;
	}, [pathname, meta.documentTitle]);
}

function BreadcrumbTrail({
	crumbs,
}: {
	crumbs: { label: string; href?: string }[];
}) {
	return (
		<Breadcrumb>
			<BreadcrumbList>
				{crumbs.map((crumb, i) => (
					<span key={`${crumb.label}-${i}`} className="contents">
						{i > 0 && <BreadcrumbSeparator />}
						<BreadcrumbItem className="max-w-[14rem] truncate sm:max-w-xs">
							{crumb.href ? (
								<BreadcrumbLink asChild>
									<Link to={crumb.href}>{crumb.label}</Link>
								</BreadcrumbLink>
							) : (
								<BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
							)}
						</BreadcrumbItem>
					</span>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

function Breadcrumbs() {
	const { pathname } = useLocation();
	const { meta } = usePageMetaContext();

	if (pathname === "/") {
		return <BreadcrumbTrail crumbs={[{ label: NAV.projects }]} />;
	}

	if (pathname === "/settings") {
		return <BreadcrumbTrail crumbs={[{ label: NAV.settings }]} />;
	}

	if (pathname === "/projects/new") {
		return <BreadcrumbTrail crumbs={[{ label: NAV.newCompilation }]} />;
	}

	if (pathname.startsWith("/projects/")) {
		return (
			<BreadcrumbTrail
				crumbs={[
					{ label: NAV.projects, href: "/" },
					{ label: meta.breadcrumb ?? "Compilation" },
				]}
			/>
		);
	}

	return null;
}

function AppLayoutInner() {
	useDocumentTitle();
	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "15rem",
				} as React.CSSProperties
			}
		>
			<GlobalHotkeys>
				<AppSidebar />
				<SidebarInset>
					<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm">
						<SidebarTrigger className="-ml-1" />
						<Breadcrumbs />
					</header>
					<main
						id="main-content"
						className="flex flex-1 flex-col px-4 py-6 md:px-8 md:py-8"
					>
						<div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
							<Outlet />
						</div>
					</main>
				</SidebarInset>
			</GlobalHotkeys>
		</SidebarProvider>
	);
}

export function AppLayout() {
	return (
		<PageMetaProvider>
			<AppLayoutInner />
		</PageMetaProvider>
	);
}
