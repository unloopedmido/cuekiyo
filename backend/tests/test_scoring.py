from app.services.youtube_sourcer import REJECT_KEYWORDS, score_candidate


def test_remix_penalty():
    entry = {
        "id": "abc",
        "title": "Anime OP1 Remix Nightcore Extended",
        "view_count": 1000000,
        "duration": 90,
        "webpage_url": "https://youtube.com/watch?v=abc",
    }
    result = score_candidate(entry, "Naruto", "Blue Bird", "Ikimonogakari", "opening", 1)
    assert any(kw in result.rejection_flags for kw in REJECT_KEYWORDS[:3])
    assert result.score < 50


def test_good_title_scores_higher():
    good = score_candidate(
        {
            "id": "1",
            "title": "Naruto Opening 1 Blue Bird",
            "view_count": 5000000,
            "duration": 90,
        },
        "Naruto",
        "Blue Bird",
        "Ikimonogakari",
        "opening",
        1,
    )
    bad = score_candidate(
        {
            "id": "2",
            "title": "random vlog",
            "view_count": 100,
            "duration": 300,
        },
        "Naruto",
        "Blue Bird",
        None,
        "opening",
        1,
    )
    assert good.score > bad.score


def test_wrong_opening_number_scores_lower():
    correct = score_candidate(
        {
            "id": "1",
            "title": "One Piece Opening 1 | We Are! by Hiroshi Kitadani",
            "view_count": 5_000_000,
            "duration": 90,
        },
        "One Piece",
        "We Are!",
        "Hiroshi Kitadani",
        "opening",
        1,
    )
    wrong = score_candidate(
        {
            "id": "2",
            "title": "One Piece Opening 20 | Hope by Namie Amuro",
            "view_count": 44_000_000,
            "duration": 90,
        },
        "One Piece",
        "We Are!",
        "Hiroshi Kitadani",
        "opening",
        1,
    )
    assert correct.score > wrong.score


def test_lyrics_upload_is_not_rejected():
    result = score_candidate(
        {
            "id": "1",
            "title": "One Piece OP 1 - We Are! Lyrics",
            "view_count": 37_000_000,
            "duration": 90,
        },
        "One Piece",
        "We Are!",
        "Hiroshi Kitadani",
        "opening",
        1,
    )
    assert result.rejection_flags == []
    assert result.score > 60


def test_similar_song_title_scores_lower():
    correct = score_candidate(
        {
            "id": "1",
            "title": "Black Clover Opening 3 | Black Rover by Vickeblanka",
            "view_count": 5_000_000,
            "duration": 90,
        },
        "Black Clover",
        "Black Rover",
        "Vickeblanka",
        "opening",
        3,
    )
    wrong = score_candidate(
        {
            "id": "2",
            "title": "Black Clover Opening 10 | Black Catcher by Vickeblanka",
            "view_count": 44_000_000,
            "duration": 90,
        },
        "Black Clover",
        "Black Rover",
        "Vickeblanka",
        "opening",
        3,
    )
    assert correct.score > wrong.score
