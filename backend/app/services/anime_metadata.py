import logging
from typing import Any

from app.config import settings
from app.services import anilist_client, jikan_client

logger = logging.getLogger(__name__)


def _normalize_jikan(anime_data: dict[str, Any]) -> dict[str, Any]:
    import json

    return {
        "mal_id": anime_data.get("mal_id"),
        "title": anime_data.get("title", ""),
        "title_english": anime_data.get("title_english"),
        "image_url": (anime_data.get("images") or {}).get("jpg", {}).get("image_url"),
        "year": anime_data.get("year"),
        "source": "jikan",
        "raw_json": json.dumps(anime_data),
        "_jikan": anime_data,
    }


def _provider_order() -> tuple[str, str]:
    primary = settings.anime_metadata_provider
    fallback = "anilist" if primary == "jikan" else "jikan"
    return primary, fallback


async def _search_with(provider: str, query: str, limit: int) -> list[dict[str, Any]]:
    if provider == "anilist":
        return await anilist_client.search_anime(query, limit=limit)
    data = await jikan_client.search_anime(query, limit=limit)
    return [_normalize_jikan(item) for item in data if item.get("mal_id")]


async def _get_with(provider: str, mal_id: int) -> dict[str, Any]:
    if provider == "anilist":
        return await anilist_client.get_anime(mal_id)
    return _normalize_jikan(await jikan_client.get_anime(mal_id))


async def search_anime(query: str, limit: int = 10) -> list[dict[str, Any]]:
    primary, fallback = _provider_order()
    for provider in (primary, fallback):
        try:
            results = await _search_with(provider, query, limit)
            if results:
                if provider != primary:
                    logger.info(
                        "Anime search fell back to %s for query=%r", provider, query
                    )
                return results
        except Exception:
            logger.warning(
                "Anime search failed with %s for query=%r",
                provider,
                query,
                exc_info=True,
            )
    return []


async def get_anime(mal_id: int) -> dict[str, Any]:
    primary, fallback = _provider_order()
    last_error: Exception | None = None
    for provider in (primary, fallback):
        try:
            result = await _get_with(provider, mal_id)
            if provider != primary:
                logger.info("Anime lookup fell back to %s for mal_id=%s", provider, mal_id)
            return result
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Anime lookup failed with %s for mal_id=%s",
                provider,
                mal_id,
                exc_info=True,
            )
    assert last_error is not None
    raise last_error


async def get_themes(mal_id: int) -> tuple[list[str], list[str]]:
    """Opening/ending themes are only available from Jikan."""
    anime_data = await jikan_client.get_anime(mal_id)
    return jikan_client.extract_themes(anime_data)


def anime_to_cache_fields(anime_data: dict[str, Any]) -> dict[str, Any]:
    return {
        "mal_id": anime_data.get("mal_id"),
        "title": anime_data.get("title", ""),
        "title_english": anime_data.get("title_english"),
        "image_url": anime_data.get("image_url"),
        "year": anime_data.get("year"),
        "raw_json": anime_data.get("raw_json", "{}"),
    }
