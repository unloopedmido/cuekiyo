import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../api";
import type { Song } from "../types";
import { GripVertical, Eye, Play, ArrowUpDown } from "lucide-react";

function SortableItem({ song, views, index }: { song: Song; views: number; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatIndex = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-4 rounded-lg border p-3.5 transition-all ${
        isDragging
          ? "border-brand-amber bg-brand-raised/90 shadow-lg shadow-brand-amber/10 z-50 scale-[1.01] cursor-grabbing"
          : "border-brand-border bg-brand-raised/20 hover:border-zinc-600 hover:bg-brand-raised/40 cursor-grab"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Grip Handle */}
        <div className="text-zinc-600 group-hover:text-zinc-400 shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Index Badge */}
        <div className="font-mono text-xs font-bold text-brand-amber shrink-0 bg-brand-base border border-brand-border px-2 py-0.5 rounded">
          {formatIndex(index)}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              {song.song_type === "opening" ? "OP" : "ED"} {song.song_number}
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <h5 className="text-xs font-mono font-semibold text-zinc-400 uppercase truncate">
              {song.anime_name}
            </h5>
          </div>
          <p className="text-xs font-medium text-zinc-200 truncate mt-0.5">
            {song.song_title}
            {song.artist && <span className="text-zinc-500 font-normal"> — {song.artist}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 bg-brand-base px-2 py-1 rounded border border-brand-border/40">
          <Eye className="h-3 w-3 text-zinc-600" />
          <span>{views.toLocaleString()} VIEWS</span>
        </div>
      </div>
    </li>
  );
}

export default function RenderOrder({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [viewMap, setViewMap] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.listSongs(projectId).then(async (s) => {
      setSongs([...s].sort((a, b) => a.render_order - b.render_order));
      const vm: Record<string, number> = {};
      for (const song of s) {
        const cands = await api.listCandidates(projectId, song.id);
        const sel = cands.find((c) => c.is_selected);
        vm[song.id] = sel?.view_count ?? 0;
      }
      setViewMap(vm);
    });
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
    if (
      !window.confirm(
        "Sort all songs by view count (descending)? You can drag to change the order afterward.",
      )
    ) {
      return;
    }
    setSongs([...songs].sort((a, b) => (viewMap[b.id] ?? 0) - (viewMap[a.id] ?? 0)));
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      await api.updateRenderOrder(
        projectId,
        songs.map((s) => s.id),
      );
      await api.confirmRenderOrder(projectId);
      onDone();
    } catch (e) {
      alert("Failed to confirm render order: " + e);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Render order</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Drag clips into playback order, or auto-sort by view count.
          </p>
        </div>
        <button
          onClick={autoSort}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase text-zinc-400 bg-brand-raised hover:bg-brand-raised/80 hover:text-brand-amber border border-brand-border px-3 py-1.5 rounded transition-all cursor-pointer"
        >
          <ArrowUpDown className="h-3 w-3" />
          <span>Auto-Sort by Views</span>
        </button>
      </div>

      {/* Sortable List */}
      <div className="max-h-[50vh] overflow-y-auto pr-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2.5">
              {songs.map((s, index) => (
                <SortableItem
                  key={s.id}
                  song={s}
                  views={viewMap[s.id] ?? 0}
                  index={index}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {/* Confirmation Deck */}
      <div className="border-t border-brand-border pt-4 flex justify-between items-center">
        <span className="font-mono text-[10px] text-zinc-500 uppercase">
          Ready to compile {songs.length} scenes
        </span>
        <button
          onClick={confirm}
          disabled={confirming}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-amber px-5 py-2.5 text-xs font-semibold text-brand-base hover:bg-brand-amber-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {confirming ? "Starting render..." : "Confirm and render"}
        </button>
      </div>
    </div>
  );
}

