import re
from dataclasses import dataclass

from app.enums import SongType

# Examples: "1: \"Title\" by Artist (eps 1-12)" or "OP1: Title"
THEME_RE = re.compile(
    r"^(?:(?:OP|ED|Opening|Ending)\s*)?(\d+)\s*[:.]?\s*[\"']?(.+?)[\"']?\s*(?:by\s+(.+?))?(?:\s*\(|$)",
    re.IGNORECASE,
)
SIMPLE_NUM_RE = re.compile(r"^(\d+)\s*[:.]\s*(.+)$", re.IGNORECASE)


@dataclass
class ParsedTheme:
    song_type: SongType
    song_number: int
    song_title: str
    artist: str | None
    raw_text: str


def parse_theme_line(line: str, song_type: SongType) -> ParsedTheme | None:
    text = line.strip()
    if not text or text.lower() in ("none", "n/a"):
        return None

    m = THEME_RE.match(text)
    if m:
        num, title, artist = m.group(1), m.group(2).strip(), m.group(3)
        artist_clean = artist.strip() if artist else None
        return ParsedTheme(song_type, int(num), title.strip(' "\''), artist_clean, text)

    m2 = SIMPLE_NUM_RE.match(text)
    if m2:
        return ParsedTheme(song_type, int(m2.group(1)), m2.group(2).strip(' "\''), None, text)

    # Fallback: treat whole line as title with number 1
    return ParsedTheme(song_type, 1, text, None, text)


def parse_themes(openings: list[str] | None, endings: list[str] | None, song_types: list[SongType]) -> list[ParsedTheme]:
    results: list[ParsedTheme] = []
    if SongType.OPENING in song_types and openings:
        for line in openings:
            parsed = parse_theme_line(line, SongType.OPENING)
            if parsed:
                results.append(parsed)
    if SongType.ENDING in song_types and endings:
        for line in endings:
            parsed = parse_theme_line(line, SongType.ENDING)
            if parsed:
                results.append(parsed)
    return results
