import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

type AnimePick = { mal_id: number; title: string };

export default function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimePick[]>([]);
  const [animes, setAnimes] = useState<AnimePick[]>([]);
  const [songTypes, setSongTypes] = useState<string[]>(["opening"]);
  const [songsCount, setSongsCount] = useState(5);
  const [clipTime, setClipTime] = useState(10);
  const [encoder, setEncoder] = useState("auto");
  const [audioNorm, setAudioNorm] = useState(true);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (query.length < 2) return;
    const r = await api.searchAnime(query);
    setResults(r.map((x) => ({ mal_id: x.mal_id, title: x.title })));
  };

  const submit = async () => {
    setLoading(true);
    try {
      const p = await api.createProject({
        title,
        animes: animes.map((a, i) => ({
          anime_mal_id: a.mal_id,
          anime_name: a.title,
          display_order: i,
        })),
        songs_count: songsCount,
        song_types: songTypes,
        clip_time: clipTime,
        encoder,
        audio_normalize: audioNorm,
      });
      await api.loadThemes(p.id);
      onCreated();
      onClose();
      nav(`/projects/${p.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 className="mb-4 text-lg font-semibold">New project</h3>
        <label className="mb-2 block text-sm text-zinc-400">Title</label>
        <input
          className="mb-4 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="mb-2 block text-sm text-zinc-400">Anime</label>
        <div className="mb-2 flex gap-2">
          <input
            className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button onClick={search} className="rounded bg-zinc-700 px-3 text-sm">
            Search
          </button>
        </div>
        <div className="mb-2 max-h-24 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.mal_id}
              className="block w-full px-2 py-1 text-left text-sm hover:bg-zinc-800"
              onClick={() => {
                if (!animes.find((a) => a.mal_id === r.mal_id)) setAnimes([...animes, r]);
              }}
            >
              {r.title}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {animes.map((a) => (
            <span key={a.mal_id} className="rounded bg-indigo-900 px-2 py-1 text-xs">
              {a.title}
              <button className="ml-1" onClick={() => setAnimes(animes.filter((x) => x.mal_id !== a.mal_id))}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <label>
            <input
              type="checkbox"
              checked={songTypes.includes("opening")}
              onChange={(e) =>
                setSongTypes(
                  e.target.checked
                    ? [...songTypes, "opening"]
                    : songTypes.filter((t) => t !== "opening"),
                )
              }
            />{" "}
            Openings
          </label>
          <label>
            <input
              type="checkbox"
              checked={songTypes.includes("ending")}
              onChange={(e) =>
                setSongTypes(
                  e.target.checked
                    ? [...songTypes, "ending"]
                    : songTypes.filter((t) => t !== "ending"),
                )
              }
            />{" "}
            Endings
          </label>
          <label>
            Songs count
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1"
              value={songsCount}
              onChange={(e) => setSongsCount(Number(e.target.value))}
            />
          </label>
          <label>
            Clip time (s)
            <input
              type="number"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1"
              value={clipTime}
              onChange={(e) => setClipTime(Number(e.target.value))}
            />
          </label>
          <label className="col-span-2">
            Encoder
            <select
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1"
              value={encoder}
              onChange={(e) => setEncoder(e.target.value)}
            >
              <option value="auto">auto</option>
              <option value="libx264">libx264</option>
              <option value="h264_nvenc">h264_nvenc</option>
              <option value="hevc_nvenc">hevc_nvenc</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={audioNorm} onChange={(e) => setAudioNorm(e.target.checked)} /> Audio
            normalize
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-zinc-400">
            Cancel
          </button>
          <button
            disabled={!title || animes.length === 0 || loading}
            onClick={submit}
            className="rounded bg-indigo-600 px-4 py-2 text-sm disabled:opacity-50"
          >
            Create & load themes
          </button>
        </div>
      </div>
    </div>
  );
}
