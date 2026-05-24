import re

MAL_URL = re.compile(r"myanimelist\.net/anime/(\d+)", re.I)
ANILIST_URL = re.compile(r"anilist\.co/anime/(\d+)", re.I)
PLAIN_ID = re.compile(r"^\d{1,7}$")


def parse_anime_list_text(text: str) -> list[int]:
    ids: list[int] = []
    seen: set[int] = set()
    for token in re.split(r"[\s,;]+", text.strip()):
        if not token:
            continue
        mal = MAL_URL.search(token)
        if mal:
            val = int(mal.group(1))
        else:
            ani = ANILIST_URL.search(token)
            if ani:
                val = int(ani.group(1))
            elif PLAIN_ID.match(token):
                val = int(token)
            else:
                continue
        if val not in seen:
            seen.add(val)
            ids.append(val)
    return ids
