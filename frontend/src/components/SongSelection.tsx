import { useEffect, useState } from "react";
import { api } from "../api";
import type { Project, ThemeSong } from "../types";
import { motion } from "motion/react";
import { motionProps, useMotionConfig } from "../lib/motion";
import { Music, AlertTriangle, ArrowRight } from "lucide-react";

export default function SongSelection({ project, onDone }: { project: Project; onDone: () => void }) {
  const { reduce, duration } = useMotionConfig();
  const [themes, setThemes] = useState<ThemeSong[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmFewer, setConfirmFewer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listThemes(project.id)
      .then(setThemes)
      .catch((e) => console.error("Failed to load themes:", e));
  }, [project.id]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < project.songs_count) {
      next.add(id);
    }
    setSelected(next);
  };

  const submit = async () => {
    setLoading(true);
    try {
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
    } catch (e) {
      alert("Failed to submit song selection: " + e);
    } finally {
      setLoading(false);
    }
  };

  const grouped = themes.reduce<Record<string, ThemeSong[]>>((acc, t) => {
    const animeName = project.animes.find((a) => a.anime_mal_id === t.anime_mal_id)?.anime_name || "Unknown Anime";
    const key = `${animeName} · ${t.song_type === "opening" ? "Openings" : "Endings"}`;
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const canSubmit =
    selected.size === project.songs_count || (confirmFewer && selected.size > 0 && selected.size < project.songs_count);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      {...motionProps(reduce, duration)}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Select tracks</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Pick {project.songs_count} songs for this compilation.
          </p>
        </div>
        <div className="font-mono text-xs text-zinc-400 bg-brand-base px-3 py-1.5 rounded border border-brand-border">
          {selected.size} / {project.songs_count}
        </div>
      </div>

      <div className="space-y-5 max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
        {Object.entries(grouped).map(([key, items]) => (
          <div key={key} className="border border-brand-border bg-brand-base/20 rounded-lg overflow-hidden">
            <div className="bg-brand-base/60 px-4 py-2 border-b border-brand-border">
              <h4 className="text-xs font-medium text-zinc-400">{key}</h4>
            </div>

            <ul className="divide-y divide-brand-border/40">
              {items.map((t) => {
                const isSel = selected.has(t.id);
                return (
                  <li key={t.id}>
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 transition-colors text-sm min-w-0 ${
                        isSel
                          ? "bg-brand-amber-dim/50 text-zinc-100"
                          : "hover:bg-brand-raised/40 text-zinc-400"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          className="accent-brand-amber cursor-pointer shrink-0"
                          checked={isSel}
                          onChange={() => toggle(t.id)}
                        />
                        <Music className={`h-4 w-4 shrink-0 ${isSel ? "text-brand-amber" : "text-zinc-600"}`} aria-hidden />
                        <span className="min-w-0 truncate">
                          {t.song_type === "opening" ? "OP" : "ED"} {t.song_number}:{" "}
                          <strong className="text-zinc-200">{t.song_title}</strong>
                          {t.artist && <span className="text-zinc-500"> · {t.artist}</span>}
                        </span>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-brand-border pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="min-w-0">
          {selected.size < project.songs_count && (
            <label className="flex items-center gap-2.5 text-sm text-zinc-400 cursor-pointer select-none bg-brand-raised/40 px-3 py-2 rounded border border-brand-border/50">
              <input
                type="checkbox"
                className="accent-brand-amber shrink-0"
                checked={confirmFewer}
                onChange={(e) => setConfirmFewer(e.target.checked)}
              />
              <span className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 text-brand-amber shrink-0" aria-hidden />
                <span>Continue with fewer than {project.songs_count} tracks</span>
              </span>
            </label>
          )}
        </div>

        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-amber px-5 py-2.5 text-xs font-semibold text-brand-base hover:bg-brand-amber-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {loading ? "Saving..." : "Continue to sourcing"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
