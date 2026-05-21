from app.services.youtube_sourcer import _extract_thumbnail, score_candidate


def test_extract_thumbnail_prefers_direct_field():
    assert _extract_thumbnail({"thumbnail": "https://example.com/a.jpg", "id": "abc"}) == "https://example.com/a.jpg"


def test_extract_thumbnail_from_thumbnails_list():
    entry = {
        "id": "abc123",
        "thumbnails": [
            {"url": "https://example.com/low.jpg", "width": 120},
            {"url": "https://example.com/high.jpg", "width": 480},
        ],
    }
    assert _extract_thumbnail(entry) == "https://example.com/high.jpg"


def test_extract_thumbnail_falls_back_to_youtube_id():
    assert _extract_thumbnail({"id": "dQw4w9WgXcQ"}) == "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"


def test_score_candidate_uses_thumbnail_extractor():
    result = score_candidate(
        {"id": "vid1", "title": "Naruto OP", "view_count": 1000},
        "Naruto",
        "Haruka Kanata",
        "Asian Kung-Fu Generation",
        "opening",
    )
    assert result.thumbnail_url == "https://i.ytimg.com/vi/vid1/hqdefault.jpg"
