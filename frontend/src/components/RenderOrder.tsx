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

function SortableItem({ song, views }: { song: Song; views: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: song.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex cursor-grab items-center gap-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
      {...attributes}
      {...listeners}
    >
      <span className="text-zinc-500">⋮⋮</span>
      <span className="flex-1">
        {song.anime_name} — {song.song_title}
      </span>
      <span className="text-xs text-zinc-500">{views.toLocaleString()} views</span>
    </li>
  );
}

export default function RenderOrder({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [viewMap, setViewMap] = useState<Record<string, number>>({});

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
    await api.updateRenderOrder(
      projectId,
      songs.map((s) => s.id),
    );
    await api.confirmRenderOrder(projectId);
    onDone();
  };

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-400">Drag to reorder clips, then confirm to render.</p>
      <button onClick={autoSort} className="mb-4 rounded border border-zinc-600 px-3 py-1 text-sm">
        Auto-sort by views (desc)
      </button>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {songs.map((s) => (
              <SortableItem key={s.id} song={s} views={viewMap[s.id] ?? 0} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button onClick={confirm} className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm">
        Confirm order & render
      </button>
    </div>
  );
}
