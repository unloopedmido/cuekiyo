import asyncio
import json
import time
from typing import Any

import httpx

from app.config import settings

_last_request = 0.0
_lock = asyncio.Lock()
_MAX_429_RETRIES = 5


async def _rate_limit() -> None:
    global _last_request
    async with _lock:
        now = time.monotonic()
        wait = settings.jikan_rate_limit_seconds - (now - _last_request)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_request = time.monotonic()


async def _get(client: httpx.AsyncClient, path: str, retry_count: int = 0) -> dict[str, Any]:
    await _rate_limit()
    url = f"{settings.jikan_base_url}{path}"
    resp = await client.get(url, timeout=30.0)
    if resp.status_code == 429:
        if retry_count >= _MAX_429_RETRIES:
            resp.raise_for_status()
        await asyncio.sleep(min(2**retry_count, 30))
        return await _get(client, path, retry_count + 1)
    resp.raise_for_status()
    return resp.json()


async def search_anime(query: str, limit: int = 10) -> list[dict[str, Any]]:
    from urllib.parse import quote

    async with httpx.AsyncClient() as client:
        data = await _get(client, f"/anime?q={quote(query)}&limit={limit}")
        return data.get("data", [])


async def get_anime(mal_id: int) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        data = await _get(client, f"/anime/{mal_id}/full")
        return data.get("data", {})


def extract_themes(anime_data: dict[str, Any]) -> tuple[list[str], list[str]]:
    themes = anime_data.get("theme") or {}
    openings = themes.get("openings") or []
    endings = themes.get("endings") or []
    return list(openings), list(endings)


def anime_to_cache_fields(anime_data: dict[str, Any]) -> dict[str, Any]:
    return {
        "mal_id": anime_data.get("mal_id"),
        "title": anime_data.get("title", ""),
        "title_english": anime_data.get("title_english"),
        "image_url": (anime_data.get("images") or {}).get("jpg", {}).get("image_url"),
        "year": anime_data.get("year"),
        "raw_json": json.dumps(anime_data),
    }
