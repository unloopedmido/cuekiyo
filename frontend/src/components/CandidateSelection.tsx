import { useEffect, useState } from "react";
import { api } from "../api";
import type { Candidate, Song } from "../types";

export default function CandidateSelection({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});

  const refreshSongs = async () => {
    const s = await api.listSongs(projectId);
    setSongs(s);
    const map: Record<string, Candidate[]> = {};
    for (const song of s) {
      map[song.id] = await api.listCandidates(projectId, song.id);
    }
    setCandidates(map);
  };

  useEffect(() => {
    refreshSongs();
  }, [projectId]);

  const select = async (songId: string, candidateId: string) => {
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
  };

  const allSelected = songs.length > 0 && songs.every((s) => s.selected_candidate_id);

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-400">Pick one YouTube candidate per song.</p>
      {songs.map((song) => (
        <section key={song.id}>
          <h4 className="mb-3 font-medium">
            {song.anime_name} — {song.song_title}
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {(candidates[song.id] ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => select(song.id, c.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  c.is_selected || song.selected_candidate_id === c.id
                    ? "border-indigo-500 bg-indigo-950/40"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {c.thumbnail_url && (
                  <img src={c.thumbnail_url} alt="" className="mb-2 aspect-video w-full rounded object-cover" />
                )}
                <p className="line-clamp-2 text-sm font-medium">{c.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {c.uploader_name} · {c.view_count?.toLocaleString() ?? "?"} views ·{" "}
                  {c.duration ? `${Math.round(c.duration)}s` : "?"}
                </p>
                <p className="mt-1 text-xs text-zinc-600">Score: {c.score.toFixed(1)}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
      {allSelected && <p className="text-green-400 text-sm">All candidates selected — download will start automatically.</p>}
    </div>
  );
}
