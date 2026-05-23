from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services import anilist_client, anime_metadata


@pytest.mark.asyncio
async def test_anilist_search_normalizes_results():
    response = httpx.Response(
        200,
        json={
            "data": {
                "Page": {
                    "media": [
                        {
                            "idMal": 21,
                            "title": {"romaji": "One Piece", "english": "One Piece"},
                            "coverImage": {"large": "https://example.com/op.jpg"},
                            "seasonYear": 1999,
                        },
                        {
                            "idMal": None,
                            "title": {"romaji": "No MAL ID"},
                        },
                    ]
                }
            }
        },
        request=httpx.Request("POST", "https://graphql.anilist.co"),
    )
    client = AsyncMock()
    client.post = AsyncMock(return_value=response)

    with patch.object(anilist_client, "_rate_limit", new=AsyncMock()):
        results = await anilist_client._graphql(
            client, anilist_client.SEARCH_QUERY, {"search": "one piece", "perPage": 10}
        )

    assert len(results["Page"]["media"]) == 2

    with patch.object(anilist_client, "_rate_limit", new=AsyncMock()):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value = client
            items = await anilist_client.search_anime("one piece", limit=10)

    assert len(items) == 1
    assert items[0]["mal_id"] == 21
    assert items[0]["title"] == "One Piece"
    assert items[0]["image_url"] == "https://example.com/op.jpg"
    assert items[0]["year"] == 1999


@pytest.mark.asyncio
async def test_anilist_get_by_mal_id():
    response = httpx.Response(
        200,
        json={
            "data": {
                "Media": {
                    "idMal": 5114,
                    "title": {"romaji": "Fullmetal Alchemist: Brotherhood"},
                    "coverImage": {"large": "https://example.com/fmab.jpg"},
                    "seasonYear": 2009,
                }
            }
        },
        request=httpx.Request("POST", "https://graphql.anilist.co"),
    )
    client = AsyncMock()
    client.post = AsyncMock(return_value=response)

    with patch.object(anilist_client, "_rate_limit", new=AsyncMock()):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value = client
            item = await anilist_client.get_anime(5114)

    assert item["mal_id"] == 5114
    assert item["title"] == "Fullmetal Alchemist: Brotherhood"


@pytest.mark.asyncio
async def test_anilist_graphql_error_raises():
    response = httpx.Response(
        200,
        json={"errors": [{"message": "Bad query"}]},
        request=httpx.Request("POST", "https://graphql.anilist.co"),
    )
    client = AsyncMock()
    client.post = AsyncMock(return_value=response)

    with patch.object(anilist_client, "_rate_limit", new=AsyncMock()):
        with pytest.raises(httpx.HTTPError, match="AniList GraphQL error"):
            await anilist_client._graphql(client, "query {}", {})


@pytest.mark.asyncio
async def test_anime_metadata_falls_back_on_primary_failure():
    with patch.object(anime_metadata.settings, "anime_metadata_provider", "anilist"):
        with patch.object(
            anilist_client,
            "search_anime",
            new=AsyncMock(side_effect=httpx.HTTPError("down")),
        ) as mock_anilist:
            with patch.object(
                anime_metadata.jikan_client,
                "search_anime",
                new=AsyncMock(
                    return_value=[
                        {
                            "mal_id": 1,
                            "title": "Cowboy Bebop",
                            "title_english": "Cowboy Bebop",
                            "images": {"jpg": {"image_url": "https://example.com/cb.jpg"}},
                            "year": 1998,
                        }
                    ]
                ),
            ) as mock_jikan:
                results = await anime_metadata.search_anime("bebop")

    assert len(results) == 1
    assert results[0]["mal_id"] == 1
    mock_anilist.assert_awaited_once()
    mock_jikan.assert_awaited_once()


@pytest.mark.asyncio
async def test_anime_metadata_get_themes_uses_jikan():
    with patch.object(
        anime_metadata.jikan_client,
        "get_anime",
        new=AsyncMock(return_value={"theme": {"openings": ["OP1"], "endings": ["ED1"]}}),
    ) as mock_get:
        openings, endings = await anime_metadata.get_themes(1)

    assert openings == ["OP1"]
    assert endings == ["ED1"]
    mock_get.assert_awaited_once_with(1)
