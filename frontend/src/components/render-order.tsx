import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowDown01Icon,
	DragDropVerticalIcon,
} from "@hugeicons/core-free-icons";
import { api } from "@/api";
import type { Song } from "@/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function SortableRow({
	song,
	views,
	index,
	count,
	onReorder,
}: {
	song: Song;
	views: number;
	index: number;
	count: number;
	onReorder: (oldIndex: number, newIndex: number) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: song.id });
	const style = { transform: CSS.Transform.toString(transform), transition };

	return (
		<li
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-lg border border-border/80 bg-card/50 px-3 py-3 shadow-sm"
			{...attributes}
			onKeyDown={(event) => {
				if (isDragging) return;
				if (event.key === "ArrowUp" && index > 0) {
					event.preventDefault();
					onReorder(index, index - 1);
				} else if (event.key === "ArrowDown" && index < count - 1) {
					event.preventDefault();
					onReorder(index, index + 1);
				}
			}}
			{...listeners}
		>
			<HugeiconsIcon
				icon={DragDropVerticalIcon}
				strokeWidth={2}
				className="text-muted-foreground"
			/>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-medium">{song.song_title}</span>
				<span className="block truncate text-xs text-muted-foreground">
					{song.anime_name}
				</span>
			</span>
			<span className="text-xs tabular-nums text-muted-foreground">
				{views.toLocaleString()}
			</span>
		</li>
	);
}

export function RenderOrder({
	projectId,
	onDone,
}: {
	projectId: string;
	onDone: () => void;
}) {
	const [songs, setSongs] = useState<Song[]>([]);
	const [viewMap, setViewMap] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [sortKey, setSortKey] = useState(0);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const prevOrder = useRef<Song[]>([]);

	useEffect(() => {
		api
			.listSongs(projectId)
			.then(async (s) => {
				setSongs([...s].sort((a, b) => a.render_order - b.render_order));
				const vm: Record<string, number> = {};
				for (const song of s) {
					const cands = await api.listCandidates(projectId, song.id);
					const sel = cands.find((c) => c.is_selected);
					vm[song.id] = sel?.view_count ?? 0;
				}
				setViewMap(vm);
			})
			.finally(() => setLoading(false));
	}, [projectId]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = songs.findIndex((s) => s.id === active.id);
		const newIndex = songs.findIndex((s) => s.id === over.id);
		setSongs(arrayMove(songs, oldIndex, newIndex));
	};

	const autoSort = () => {
		prevOrder.current = songs;
		setSongs([...songs].sort((a, b) => (viewMap[b.id] ?? 0) - (viewMap[a.id] ?? 0)));
		setSortKey((k) => k + 1);
	};

	useEffect(() => {
		if (sortKey === 0) return;
		const timer = setTimeout(() => setSortKey(0), 8000);
		return () => clearTimeout(timer);
	}, [sortKey]);

	const undoSort = () => {
		setSortKey(0);
		setSongs(prevOrder.current);
	};

	const confirm = async () => {
		setSubmitting(true);
		try {
			await api.updateRenderOrder(
				projectId,
				songs.map((s) => s.id),
			);
			await api.confirmRenderOrder(projectId);
			toast.success("Render queued");
			onDone();
		} catch (e) {
			toast.error(String(e));
		} finally {
			setSubmitting(false);
			setConfirmOpen(false);
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-14 w-full rounded-lg" />
				))}
			</div>
		);
	}

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="font-heading text-xl font-semibold">Final sequence</h2>
					<p className="text-sm text-muted-foreground">
						Drag to reorder. Higher view counts can be sorted in automatically.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={autoSort}>
					<HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} data-icon="inline-start" />
					Sort by views
				</Button>
			</div>

			{sortKey > 0 && (
				<div className="flex items-center gap-2 text-sm">
					<span className="text-muted-foreground">Sorted by view count</span>
					<Button variant="link" size="sm" className="h-auto p-0" onClick={undoSort}>
						Undo
					</Button>
				</div>
			)}

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={onDragEnd}
			>
				<SortableContext
					items={songs.map((s) => s.id)}
					strategy={verticalListSortingStrategy}
				>
					<ul className="flex flex-col gap-2">
						{songs.map((song, index) => (
							<SortableRow
								key={song.id}
								song={song}
								views={viewMap[song.id] ?? 0}
								index={index}
								count={songs.length}
								onReorder={(oldIndex, newIndex) =>
									setSongs(arrayMove(songs, oldIndex, newIndex))
								}
							/>
						))}
					</ul>
				</SortableContext>
			</DndContext>

			<div className="flex justify-end border-t border-border/60 pt-4">
				<Button size="lg" onClick={() => setConfirmOpen(true)} disabled={songs.length === 0}>
					Start final render
				</Button>
			</div>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Start render?</AlertDialogTitle>
						<AlertDialogDescription>
							{songs.length} clips will be combined. This can take several minutes on
							your machine.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Back</AlertDialogCancel>
						<AlertDialogAction onClick={() => void confirm()} disabled={submitting}>
							{submitting && <LoadingSpinner data-icon="inline-start" />}
							Render
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
