import pytest
from unittest.mock import AsyncMock, patch

from app.services.anime_list_parser import parse_anime_list_text


@pytest.mark.parametrize(
    "line,expected",
    [
        ("12345", [12345]),
        ("https://myanimelist.net/anime/12345/Title", [12345]),
        ("https://anilist.co/anime/67890", [67890]),
        ("12345, 67890\nhttps://myanimelist.net/anime/11111/x", [12345, 67890, 11111]),
    ],
)
def test_parse_anime_list_text(line, expected):
    assert parse_anime_list_text(line) == expected


def test_parse_anime_list_text_deduplicates():
    text = "12345\n12345\nhttps://myanimelist.net/anime/12345/x"
    assert parse_anime_list_text(text) == [12345]


def test_resolve_anime_list_returns_results(client):
    fake_meta = {
        "mal_id": 12345,
        "title": "Test Anime",
        "title_english": "Test",
        "image_url": "https://example.com/img.jpg",
        "year": 2020,
    }
    with patch(
        "app.api.routes.anime_metadata.get_anime",
        new=AsyncMock(return_value=fake_meta),
    ):
        res = client.post("/api/anime/resolve-list", json={"text": "12345"})
    assert res.status_code == 200
    body = res.json()
    assert len(body["resolved"]) == 1
    assert body["resolved"][0]["mal_id"] == 12345
    assert body["skipped"] == 0


def test_resolve_anime_list_rejects_empty(client):
    res = client.post("/api/anime/resolve-list", json={"text": "not valid"})
    assert res.status_code == 400


def test_resolve_anime_list_rejects_too_many(client):
    text = " ".join(str(i) for i in range(1, 102))
    res = client.post("/api/anime/resolve-list", json={"text": text})
    assert res.status_code == 400
    assert "100" in res.json()["detail"]
