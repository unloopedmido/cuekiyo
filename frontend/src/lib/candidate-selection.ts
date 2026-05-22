type CandidateSelectableSong = {
  id: string
  selected_candidate_id?: string | null
}

export function nextUnselectedSongId(
  songs: CandidateSelectableSong[],
  selectedSongId: string
): string | null {
  return (
    songs.find(
      (song) => song.id !== selectedSongId && !song.selected_candidate_id
    )?.id ?? null
  )
}
