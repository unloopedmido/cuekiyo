from unittest.mock import patch


def test_overlay_preview_returns_png_bytes(client):
    with patch("app.api.routes.render_overlay_png") as render:
        def fake_render(content, width, height, output_path, config=None):
            output_path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"x" * 100)

        render.side_effect = fake_render
        res = client.post("/api/overlay/preview", json={"width": 1280, "height": 720})
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
