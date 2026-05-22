import { useEffect, useRef, useState } from "react";
import { ArrowDownWideNarrow, GripVertical, ListOrdered } from "lucide-react";
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
import { useToast } from "../hooks/useToast";
import type { Song } from "../types";
import PulseBlock from "./PulseBlock";

function SortableItem({ song, views, index, count, onReorder }: { song: Song; views: number; index: number; count: number; onReorder: (oldIndex: number, newIndex: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex cursor-grab items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3"
      {...attributes}
      onKeyDown={(event) => {
        if (isDragging) return;
        if (event.key === "ArrowUp") {
          if (index > 0) {
            event.preventDefault();
            onReorder(index, index - 1);
          }
        } else if (event.key === "ArrowDown") {
          if (index < count - 1) {
            event.preventDefault();
            onReorder(index, index + 1);
          }
        }
      }}
      {...listeners}
    >
      <GripVertical size={16} className="text-muted" aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{song.song_title}</span>
        <span className="block type-label text-muted truncate">{song.anime_name}</span>
      </span>
      <span className="type-label text-muted">{views.toLocaleString()} views</span>
    </li>
  );
}

export default function RenderOrder({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const { addToast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [viewMap, setViewMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState(0);
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const prevOrder = useRef<Song[]>([]);

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
      setLoading(false);
    }).catch(() => setLoading(false));
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
      addToast("Render started", "success");
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-1">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-lime/10 text-lime">
            <ListOrdered size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="type-title">Arrange render order</h2>
            <p className="type-body mt-1 text-muted">Drag clips into the final sequence.</p>
          </div>
        </div>
        <button
          onClick={autoSort}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm transition-colors duration-150 hover:bg-white/[0.06]"
        >
          <ArrowDownWideNarrow size={15} aria-hidden="true" />
          Sort by views
        </button>
      </div>

      {sortKey > 0 && (
        <div className="mb-4 flex items-center gap-3" aria-live="polite">
          <span className="type-label text-muted">Sorted by views</span>
          <button
            onClick={undoSort}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs transition-colors duration-150 hover:bg-white/[0.06]"
          >
            Undo
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PulseBlock key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="py-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {songs.map((song, index) => (
                  <SortableItem
                    key={song.id}
                    song={song}
                    views={viewMap[song.id] ?? 0}
                    index={index}
                    count={songs.length}
                    onReorder={(oldIndex, newIndex) => setSongs(arrayMove(songs, oldIndex, newIndex))}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.08] pt-5 md:flex-row md:items-center md:justify-end">
        {confirmStep ? (
          <>
            <p className="type-body text-muted md:mr-auto">
              Render {songs.length} clips into the final video? This may take several minutes.
            </p>
            <button
              onClick={() => setConfirmStep(false)}
              className="rounded-xl px-4 py-3 type-body text-muted transition-colors duration-150 hover:text-soft"
            >
              Go back
            </button>
            <button disabled={submitting} onClick={confirm} className="rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio disabled:opacity-45 transition-opacity duration-150 hover:opacity-90 active:opacity-80">
              {submitting ? "Rendering..." : "Start render"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmStep(true)}
            className="rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio transition-opacity duration-150 hover:opacity-90 active:opacity-80"
          >
            Confirm order and render
          </button>
        )}
      </div>
    </div>
  );
}
