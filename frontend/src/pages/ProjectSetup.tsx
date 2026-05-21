import { FormEvent, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { errorToMessage } from "../lib/errors";

type AnimePick = { mal_id: number; title: string; title_english?: string; year?: number };

export default function ProjectSetup() {
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (query.trim().length < 2) return;
    setError(null);
    const response = await api.searchAnime(query.trim());
    setResults(response);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || animes.length === 0 || songTypes.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const project = await api.createProject({
        title: title.trim(),
        animes: animes.map((anime, index) => ({
          anime_mal_id: anime.mal_id,
          anime_name: anime.title,
          display_order: index,
        })),
        songs_count: songsCount,
        song_types: songTypes,
        clip_time: clipTime,
        encoder,
        audio_normalize: audioNorm,
      });
      await api.loadThemes(project.id);
      nav(`/projects/${project.id}`);
    } catch (e) {
      setError(errorToMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleSongType = (type: string, checked: boolean) => {
    setSongTypes((current) =>
      checked ? Array.from(new Set([...current, type])) : current.filter((item) => item !== type),
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section>
        <div className="mb-8">
          <p className="text-sm font-medium text-lime">Project setup</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-soft">
            Choose the source anime and let the pipeline take the first pass.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Defaults favor a one-shot compilation. Advanced export settings stay available without
            slowing down the normal path.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="project-title">
              Project title
            </label>
            <input
              id="project-title"
              className="w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Spring openings cut"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="anime-search">
              Anime
            </label>
            <div className="flex gap-2">
              <input
                id="anime-search"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void search();
                  }
                }}
                placeholder="Search by title"
              />
              <button
                type="button"
                onClick={() => void search()}
                className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-medium text-studio"
              >
                <Search size={16} aria-hidden="true" />
                Search
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-panel/80 p-2">
                {results.map((result) => (
                  <button
                    key={result.mal_id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                    onClick={() => {
                      if (!animes.some((anime) => anime.mal_id === result.mal_id)) {
                        setAnimes([...animes, result]);
                      }
                    }}
                  >
                    <span>{result.title_english || result.title}</span>
                    {result.year && <span className="text-xs text-muted">{result.year}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {animes.map((anime) => (
                <span
                  key={anime.mal_id}
                  className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-sm"
                >
                  {anime.title}
                  <button
                    type="button"
                    aria-label={`Remove ${anime.title}`}
                    onClick={() => setAnimes(animes.filter((item) => item.mal_id !== anime.mal_id))}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-white/10 bg-panel/60 p-4">
              <span className="text-sm font-medium">Song types</span>
              <span className="mt-3 flex gap-3 text-sm text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={songTypes.includes("opening")}
                    onChange={(event) => toggleSongType("opening", event.target.checked)}
                  />
                  Openings
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={songTypes.includes("ending")}
                    onChange={(event) => toggleSongType("ending", event.target.checked)}
                  />
                  Endings
                </label>
              </span>
            </label>
            <label className="rounded-2xl border border-white/10 bg-panel/60 p-4">
              <span className="text-sm font-medium">Songs</span>
              <input
                type="number"
                min={1}
                max={50}
                className="mt-3 w-full rounded-xl border border-white/10 bg-studio px-3 py-2 text-sm"
                value={songsCount}
                onChange={(event) => setSongsCount(Number(event.target.value))}
              />
            </label>
            <label className="rounded-2xl border border-white/10 bg-panel/60 p-4">
              <span className="text-sm font-medium">Clip length</span>
              <input
                type="number"
                min={3}
                className="mt-3 w-full rounded-xl border border-white/10 bg-studio px-3 py-2 text-sm"
                value={clipTime}
                onChange={(event) => setClipTime(Number(event.target.value))}
              />
            </label>
          </div>

          <section className="rounded-2xl border border-white/10 bg-panel/50">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-4 text-left"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal size={16} aria-hidden="true" />
                Export defaults
              </span>
              <span className="text-xs text-muted">{advancedOpen ? "Hide" : "Show"}</span>
            </button>
            {advancedOpen && (
              <div className="grid gap-4 border-t border-white/10 p-4 md:grid-cols-2">
                <label className="text-sm">
                  Encoder
                  <select
                    className="mt-2 w-full rounded-xl border border-white/10 bg-studio px-3 py-2"
                    value={encoder}
                    onChange={(event) => setEncoder(event.target.value)}
                  >
                    <option value="auto">auto</option>
                    <option value="libx264">libx264</option>
                    <option value="h264_nvenc">h264_nvenc</option>
                    <option value="hevc_nvenc">hevc_nvenc</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={audioNorm}
                    onChange={(event) => setAudioNorm(event.target.checked)}
                  />
                  Normalize audio
                </label>
              </div>
            )}
          </section>

          {error && <p className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-200">{error}</p>}

          <div className="sticky bottom-24 flex justify-end gap-2 rounded-2xl border border-white/10 bg-panel/90 p-3 backdrop-blur-xl md:bottom-4">
            <button
              type="submit"
              disabled={!title.trim() || animes.length === 0 || songTypes.length === 0 || loading}
              className="rounded-xl bg-lime px-5 py-3 text-sm font-medium text-studio disabled:opacity-45"
            >
              {loading ? "Creating..." : "Create and load themes"}
            </button>
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-white/10 bg-panel/70 p-5">
        <h2 className="text-sm font-semibold">One-shot path</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted">
          <li>1. Save the setup and load theme songs.</li>
          <li>2. Review only the song and clip choices that need taste.</li>
          <li>3. Let download, preparation, overlays, and rendering continue automatically.</li>
        </ol>
      </aside>
    </form>
  );
}
