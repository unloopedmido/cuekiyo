import { useEffect, useState } from "react";
import { api } from "../api";
import type { Project, ThemeSong } from "../types";

export default function SongSelection({ project, onDone }: { project: Project; onDone: () => void }) {
  const [themes, setThemes] = useState<ThemeSong[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmFewer, setConfirmFewer] = useState(false);

  useEffect(() => {
    api.listThemes(project.id).then(setThemes);
  }, [project.id]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < project.songs_count) next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    const picks = themes.filter((t) => selected.has(t.id));
    const animeMap = Object.fromEntries(project.animes.map((a) => [a.anime_mal_id, a.anime_name]));
    await api.selectSongs(project.id, {
      confirm_fewer: confirmFewer,
      songs: picks.map((t) => ({
        anime_mal_id: t.anime_mal_id,
        anime_name: animeMap[t.anime_mal_id] ?? "Unknown",
        song_type: t.song_type,
        song_number: t.song_number,
        song_title: t.song_title,
        artist: t.artist,
        raw_theme_text: t.raw_text,
      })),
    });
    onDone();
  };

  const grouped = themes.reduce<Record<string, ThemeSong[]>>((acc, t) => {
    const key = `${t.anime_mal_id}-${t.song_type}`;
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const canSubmit =
    selected.size === project.songs_count || (confirmFewer && selected.size > 0 && selected.size < project.songs_count);

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-400">
        Select {project.songs_count} songs ({selected.size} selected)
      </p>
      {Object.entries(grouped).map(([key, items]) => (
        <div key={key} className="mb-6">
          <h4 className="mb-2 font-medium capitalize">{items[0].song_type}s</h4>
          <ul className="space-y-1">
            {items.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-zinc-800">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                  <span>
                    {t.song_type === "opening" ? "OP" : "ED"}
                    {t.song_number}: {t.song_title}
                    {t.artist && <span className="text-zinc-500"> — {t.artist}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {selected.size < project.songs_count && (
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={confirmFewer} onChange={(e) => setConfirmFewer(e.target.checked)} />
          Confirm fewer than {project.songs_count} songs
        </label>
      )}
      <button
        disabled={!canSubmit}
        onClick={submit}
        className="rounded bg-indigo-600 px-4 py-2 text-sm disabled:opacity-50"
      >
        Continue to sourcing
      </button>
    </div>
  );
}
