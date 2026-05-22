import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api";
import { errorToMessage } from "@/lib/errors";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import type { Project } from "@/types";

let openPalette: (() => void) | null = null;

export function openCommandPalette() {
	openPalette?.();
}

export function CommandPalette() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [projects, setProjects] = useState<Project[]>([]);

	useEffect(() => {
		openPalette = () => setOpen(true);
		return () => {
			openPalette = null;
		};
	}, []);

	useEffect(() => {
		if (!open) return;
		api
			.listProjects()
			.then(setProjects)
			.catch(() => setProjects([]));
	}, [open]);

	const run = useCallback((fn: () => void) => {
		setOpen(false);
		fn();
	}, []);

	const projectId = window.location.pathname.match(/\/projects\/([^/]+)/)?.[1];

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<Command>
				<CommandInput placeholder="Search commands and projects..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Navigate">
						<CommandItem onSelect={() => run(() => navigate("/"))}>
							{NAV.projects}
						</CommandItem>
						<CommandItem onSelect={() => run(() => navigate("/projects/new"))}>
							{NAV.newCompilation}
						</CommandItem>
						<CommandItem onSelect={() => run(() => navigate("/settings"))}>
							{NAV.settings}
						</CommandItem>
					</CommandGroup>
					{projects.length > 0 && (
						<>
							<CommandSeparator />
							<CommandGroup heading="Compilations">
								{projects.map((p) => (
									<CommandItem
										key={p.id}
										onSelect={() => run(() => navigate(`/projects/${p.id}`))}
									>
										{p.title}
									</CommandItem>
								))}
							</CommandGroup>
						</>
					)}
					{projectId && (
						<>
							<CommandSeparator />
							<CommandGroup heading="This compilation">
								<CommandItem
									onSelect={() =>
										run(() => {
											api
												.cancel(projectId)
												.then(() => {
													toast.info("Compilation stopped");
													navigate(`/projects/${projectId}`);
												})
												.catch((e) => toast.error(errorToMessage(e)));
										})
									}
								>
									Cancel project
								</CommandItem>
								<CommandItem
									onSelect={() =>
										run(() => {
											api
												.retry(projectId)
												.then(() => {
													toast.success("Retrying failed stage");
													navigate(`/projects/${projectId}`);
												})
												.catch((e) => toast.error(errorToMessage(e)));
										})
									}
								>
									Retry failed stage
								</CommandItem>
							</CommandGroup>
						</>
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
