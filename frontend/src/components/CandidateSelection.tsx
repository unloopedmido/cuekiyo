import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../api";
import { candidateThumbnail } from "../lib/media";
import { motionProps, useMotionConfig } from "../lib/motion";
import type { Candidate, Song } from "../types";
import {
  Music,
  CheckCircle2,
  Clock,
  Eye,
  TrendingUp,
  User,
  ExternalLink,
  Play,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function CandidateSelection({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const { reduce, duration, stagger } = useMotionConfig();
  const [songs, setSongs] = useState<Song[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const refreshSongs = async () => {
    try {
      const s = await api.listSongs(projectId);
      setSongs(s);
      const map: Record<string, Candidate[]> = {};
      for (const song of s) {
        map[song.id] = await api.listCandidates(projectId, song.id);
      }
      setCandidates(map);
    } catch (e) {
      console.error("Failed to load candidates:", e);
    }
  };

  useEffect(() => {
    refreshSongs();
  }, [projectId]);

  useEffect(() => {
    if (activeIndex >= songs.length && songs.length > 0) {
      setActiveIndex(songs.length - 1);
    }
  }, [activeIndex, songs.length]);

  const select = async (songId: string, candidateId: string) => {
    setLoading((prev) => ({ ...prev, [songId]: true }));
    try {
      await api.selectCandidate(projectId, songId, candidateId);
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, selected_candidate_id: candidateId } : s)),
      );
      setCandidates((prev) => ({
        ...prev,
        [songId]: (prev[songId] ?? []).map((c) => ({
          ...c,
          is_selected: c.id === candidateId,
        })),
      }));
      onDone();
      const nextUnselected = songs.findIndex(
        (s, i) => i > activeIndex && s.id !== songId && !s.selected_candidate_id,
      );
      if (nextUnselected >= 0) {
        setActiveIndex(nextUnselected);
      } else if (activeIndex < songs.length - 1) {
        setActiveIndex((i) => i + 1);
      }
    } catch (e) {
      alert("Failed to select candidate: " + e);
    } finally {
      setLoading((prev) => ({ ...prev, [songId]: false }));
    }
  };

  const formatDuration = (secs: number | null): string => {
    if (secs === null || isNaN(secs)) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number | null): string => {
    if (views === null || isNaN(views)) return "0 views";
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K views`;
    return `${views} views`;
  };

  const selectedCount = songs.filter((s) => s.selected_candidate_id).length;
  const allSelected = songs.length > 0 && selectedCount === songs.length;
  const song = songs[activeIndex];
  const songCandidates = song ? (candidates[song.id] ?? []) : [];
  const isSongLoading = song ? loading[song.id] : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Pick YouTube uploads</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Choose the best clip for each track. Match score favors title accuracy and view count.
          </p>
        </div>
        <div className="font-mono text-xs text-zinc-400 bg-brand-base px-3 py-1.5 rounded border border-brand-border">
          {selectedCount} / {songs.length} selected
        </div>
      </div>

      {songs.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((i) => i - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-brand-border px-3 py-1.5 text-xs text-zinc-400 hover:border-brand-amber hover:text-brand-amber disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          <div className="flex flex-1 items-center justify-center gap-1.5">
            {songs.map((s, i) => {
              const done = !!s.selected_candidate_id;
              const current = i === activeIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    current ? "w-6 bg-brand-amber" : done ? "w-2 bg-brand-success" : "w-2 bg-brand-border"
                  }`}
                  aria-label={`Track ${i + 1}${done ? ", selected" : ""}`}
                />
              );
            })}
          </div>

          <button
            type="button"
            disabled={activeIndex >= songs.length - 1}
            onClick={() => setActiveIndex((i) => i + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-brand-border px-3 py-1.5 text-xs text-zinc-400 hover:border-brand-amber hover:text-brand-amber disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {song && (
          <motion.section
            key={song.id}
            className="rounded-xl border border-brand-border bg-brand-base/20 p-5"
            initial={{ opacity: 0, x: reduce ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : -20 }}
            {...motionProps(reduce, duration)}
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-brand-border/40 pb-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-lg bg-brand-raised border border-brand-border p-2.5 text-brand-amber shrink-0">
                  <Music className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{song.anime_name}</p>
                  <h4 className="text-sm font-semibold text-zinc-100 truncate">
                    {song.song_type === "opening" ? "OP" : "ED"} {song.song_number}: {song.song_title}
                  </h4>
                  {song.artist && <p className="text-sm text-zinc-500 truncate">{song.artist}</p>}
                </div>
              </div>

              {song.selected_candidate_id ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-success/30 bg-brand-success/10 px-2.5 py-1 text-[11px] font-medium text-brand-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Selected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-amber/30 bg-brand-amber-dim px-2.5 py-1 text-[11px] font-medium text-brand-amber">
                  Needs pick
                </span>
              )}
            </div>

            {songCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-sm">
                No candidates found for this track yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {songCandidates.map((c, idx) => {
                  const isSelected = c.is_selected || song.selected_candidate_id === c.id;
                  const thumb = candidateThumbnail(c);
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      disabled={isSongLoading}
                      onClick={() => select(song.id, c.id)}
                      className={`group relative flex min-w-0 flex-col rounded-lg border text-left transition-colors cursor-pointer overflow-hidden bg-brand-raised/20 ${
                        isSelected
                          ? "border-brand-amber ring-1 ring-brand-amber bg-brand-amber-dim/20"
                          : "border-brand-border hover:border-zinc-500 hover:bg-brand-raised/40"
                      } ${isSongLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: duration * 0.9, delay: idx * stagger, ease: [0.16, 1, 0.3, 1] }
                      }
                      whileHover={reduce ? undefined : { y: -2 }}
                      whileTap={reduce ? undefined : { scale: 0.985 }}
                    >
                      <div className="relative aspect-video w-full shrink-0 bg-brand-base overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={c.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-700">
                            <Play className="h-8 w-8 opacity-40" aria-hidden />
                          </div>
                        )}

                        <span className="absolute bottom-2 right-2 rounded bg-brand-base/90 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 flex items-center gap-1 border border-brand-border/50">
                          <Clock className="h-2.5 w-2.5" aria-hidden />
                          {formatDuration(c.duration)}
                        </span>

                        <span className="absolute top-2 left-2 rounded bg-brand-base/90 border border-brand-border/50 px-1.5 py-0.5 font-mono text-[10px] text-brand-amber flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5" aria-hidden />
                          {c.score.toFixed(1)}
                        </span>

                        {isSelected && (
                          <motion.div
                            className="absolute inset-0 border-2 border-brand-amber pointer-events-none"
                            layoutId={reduce ? undefined : `candidate-ring-${song.id}`}
                            {...motionProps(reduce, duration)}
                          />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                        <h5 className="line-clamp-2 text-xs font-semibold text-zinc-200 leading-snug group-hover:text-brand-amber transition-colors">
                          {c.title}
                        </h5>

                        <div className="space-y-1 font-mono text-[10px] text-zinc-500">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <User className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
                            <span className="truncate">{c.uploader_name || "Unknown uploader"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Eye className="h-3 w-3 shrink-0 text-zinc-600" aria-hidden />
                            <span>{formatViews(c.view_count)}</span>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-brand-border/40 pt-2">
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Preview
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>

                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              isSelected
                                ? "bg-brand-amber text-brand-base"
                                : "bg-brand-raised border border-brand-border text-zinc-400 group-hover:bg-brand-amber group-hover:text-brand-base group-hover:border-transparent"
                            }`}
                          >
                            {isSelected ? "Active" : "Select"}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {isSongLoading && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-amber" />
                Applying selection...
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {allSelected && (
        <motion.div
          className="rounded-lg border border-brand-success/30 bg-brand-success/5 p-4 text-sm text-brand-success flex items-center gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          {...motionProps(reduce, duration)}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All tracks assigned. Download will start automatically.
        </motion.div>
      )}
    </div>
  );
}
