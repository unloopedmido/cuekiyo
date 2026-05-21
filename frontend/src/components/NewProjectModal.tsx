import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { motionProps, useMotionConfig } from "../lib/motion";
import { X, Search, Film, Loader2 } from "lucide-react";

type AnimePick = { mal_id: number; title: string; image_url?: string | null };

export default function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const nav = useNavigate();
  const { reduce, duration } = useMotionConfig();
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
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.searchAnime(query.trim());
        setResults(
          r.map((x) => ({
            mal_id: x.mal_id,
            title: x.title,
            image_url: x.image_url,
          })),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  const addAnime = (pick: AnimePick) => {
    if (animes.some((a) => a.mal_id === pick.mal_id)) return;
    setAnimes([...animes, pick]);
    setResults([]);
    setQuery("");
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
    } catch (e) {
      alert("Failed to create project: " + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-base/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      {...motionProps(reduce, duration)}
      onClick={onClose}
    >
      <motion.div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-xl border border-brand-border bg-brand-raised shadow-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        {...motionProps(reduce, duration)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-brand-amber" aria-hidden />
            <h3 id="new-project-title" className="text-sm font-semibold text-zinc-100">
              New compilation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-brand-border hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Project title</label>
            <input
              type="text"
              placeholder="e.g. Summer Openings 2026"
              className="w-full rounded-md border border-brand-border bg-brand-base px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Anime sources</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-600" aria-hidden />
              <input
                type="text"
                placeholder="Search MyAnimeList..."
                className="w-full rounded-md border border-brand-border bg-brand-base pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-brand-amber focus:outline-none focus:ring-1 focus:ring-brand-amber transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-brand-amber" aria-hidden />
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {results.length > 0 && (
                <motion.div
                  className="mt-2 max-h-44 overflow-y-auto rounded-md border border-brand-border bg-brand-base p-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  {...motionProps(reduce, duration * 0.8)}
                >
                  {results.map((r) => (
                    <button
                      key={r.mal_id}
                      type="button"
                      className="flex w-full min-w-0 items-center gap-3 rounded px-2 py-2 text-left text-xs text-zinc-300 hover:bg-brand-raised hover:text-zinc-100 transition-colors cursor-pointer"
                      onClick={() => addAnime(r)}
                    >
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt=""
                          className="h-12 w-8 shrink-0 rounded object-cover bg-brand-raised"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-brand-raised text-[10px] text-zinc-600">
                          N/A
                        </div>
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {animes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {animes.map((a) => (
                  <span
                    key={a.mal_id}
                    className="inline-flex max-w-full items-center gap-2 rounded-md border border-brand-amber/20 bg-brand-amber-dim px-2 py-1 text-xs text-brand-amber"
                  >
                    {a.image_url && (
                      <img src={a.image_url} alt="" className="h-8 w-6 shrink-0 rounded object-cover" />
                    )}
                    <span className="max-w-[140px] truncate font-medium">{a.title}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-brand-amber/10 transition-colors cursor-pointer"
                      onClick={() => setAnimes(animes.filter((x) => x.mal_id !== a.mal_id))}
                      aria-label={`Remove ${a.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-brand-border pt-4">
            <h4 className="mb-3 text-xs font-medium text-zinc-400">Pipeline settings</h4>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 space-y-2 rounded-md bg-brand-base/30 p-3 border border-brand-border/30">
                <span className="block text-[11px] text-zinc-500 font-medium">Song types</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-brand-amber"
                      checked={songTypes.includes("opening")}
                      onChange={(e) =>
                        setSongTypes(
                          e.target.checked
                            ? [...songTypes, "opening"]
                            : songTypes.filter((t) => t !== "opening"),
                        )
                      }
                    />
                    <span className="text-zinc-300 font-medium">Openings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-brand-amber"
                      checked={songTypes.includes("ending")}
                      onChange={(e) =>
                        setSongTypes(
                          e.target.checked
                            ? [...songTypes, "ending"]
                            : songTypes.filter((t) => t !== "ending"),
                        )
                      }
                    />
                    <span className="text-zinc-300 font-medium">Endings</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-zinc-400 font-medium">Max songs</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full rounded-md border border-brand-border bg-brand-base px-2.5 py-1.5 text-zinc-200 focus:border-brand-amber focus:outline-none"
                  value={songsCount}
                  onChange={(e) => setSongsCount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-zinc-400 font-medium">Clip length (sec)</label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  className="w-full rounded-md border border-brand-border bg-brand-base px-2.5 py-1.5 text-zinc-200 focus:border-brand-amber focus:outline-none"
                  value={clipTime}
                  onChange={(e) => setClipTime(Number(e.target.value))}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-[11px] text-zinc-400 font-medium">Video encoder</label>
                <select
                  className="w-full rounded-md border border-brand-border bg-brand-base px-2.5 py-1.5 text-zinc-200 focus:border-brand-amber focus:outline-none"
                  value={encoder}
                  onChange={(e) => setEncoder(e.target.value)}
                >
                  <option value="auto">Auto-detect hardware</option>
                  <option value="libx264">libx264 (CPU)</option>
                  <option value="h264_nvenc">h264_nvenc (NVIDIA)</option>
                  <option value="hevc_nvenc">hevc_nvenc (NVIDIA HEVC)</option>
                </select>
              </div>

              <div className="col-span-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-brand-amber"
                    checked={audioNorm}
                    onChange={(e) => setAudioNorm(e.target.checked)}
                  />
                  <span className="text-zinc-300 font-medium">Loudness normalization (EBU R128)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-brand-border px-6 py-4 bg-brand-raised">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!title || animes.length === 0 || loading}
            onClick={submit}
            className="rounded-md bg-brand-amber px-5 py-2 text-xs font-semibold text-brand-base hover:bg-brand-amber-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Creating..." : "Create and load themes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
