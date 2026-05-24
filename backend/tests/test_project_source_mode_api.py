def test_create_project_with_manual_source_mode(client):
    res = client.post(
        "/api/projects",
        json={
            "title": "Manual MV",
            "animes": [{"anime_mal_id": 1, "anime_name": "Test", "display_order": 0}],
            "source_mode": "manual",
        },
    )
    assert res.status_code == 201
    assert res.json()["source_mode"] == "manual"
