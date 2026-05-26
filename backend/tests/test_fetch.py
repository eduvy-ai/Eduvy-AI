"""
tests/test_fetch.py
===================
Tests for URL-fetch and YouTube proxy routes.
All external HTTP / yt-dlp calls are mocked so no real network is needed.

Routes tested:
  POST /api/fetch-url
  GET  /api/youtube/search
  GET  /api/youtube/smart-search
  GET  /api/youtube/edu-reels
  GET  /api/youtube/video/{video_id}
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from conftest import auth_headers, USER_A

# ─── Helpers ──────────────────────────────────────────────────────────────────

MOCK_VIDEO = {
    "id": "dQw4w9WgXcQ",
    "title": "Newton's Laws of Motion",
    "channel": "EduChannel",
    "duration": 360,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
}

MOCK_YDL_INFO = {
    "entries": [
        {
            "id": "dQw4w9WgXcQ",
            "title": "Newton's Laws",
            "uploader": "EduChannel",
            "duration": 360,
            "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            "webpage_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        }
    ]
}

MOCK_SINGLE_VIDEO = {
    "id": "dQw4w9WgXcQ",
    "title": "Newton's Laws",
    "uploader": "EduChannel",
    "duration": 360,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "webpage_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "description": "Learn about Newton's Laws...",
    "view_count": 100000,
}


def _mock_ydl(info=None):
    """Return a context manager mock for yt_dlp.YoutubeDL."""
    ydl = MagicMock()
    ydl.__enter__ = MagicMock(return_value=ydl)
    ydl.__exit__ = MagicMock(return_value=False)
    ydl.extract_info = MagicMock(return_value=info or MOCK_YDL_INFO)
    return ydl


# ═══════════════════════════════════════════════════════════════════════════════
#  POST /api/fetch-url
# ═══════════════════════════════════════════════════════════════════════════════

def test_fetch_url_success(client):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "<html><head><title>Test Page</title></head><body>Hello world</body></html>"
    mock_resp.headers = {"content-type": "text/html"}

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_ac = AsyncMock()
        mock_ac.get = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_ac)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        r = client.post("/api/fetch-url", json={"url": "https://example.com"},
                        headers=auth_headers(USER_A))

    assert r.status_code == 200
    data = r.json()
    assert "text" in data or "content" in data or "html" in data or "title" in str(data)


def test_fetch_url_requires_url(client):
    r = client.post("/api/fetch-url", json={}, headers=auth_headers(USER_A))
    assert r.status_code == 422


def test_fetch_url_requires_auth(client):
    r = client.post("/api/fetch-url", json={"url": "https://example.com"})
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  GET /api/youtube/search
# ═══════════════════════════════════════════════════════════════════════════════

def test_youtube_search_success(client):
    with patch("yt_dlp.YoutubeDL", return_value=_mock_ydl()):
        r = client.get("/api/youtube/search?q=Newton+Laws",
                       headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    assert isinstance(items, list)


def test_youtube_search_missing_query(client):
    r = client.get("/api/youtube/search", headers=auth_headers(USER_A))
    assert r.status_code == 422


def test_youtube_search_requires_auth(client):
    r = client.get("/api/youtube/search?q=test")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  GET /api/youtube/smart-search
# ═══════════════════════════════════════════════════════════════════════════════

def test_youtube_smart_search(client):
    with patch("yt_dlp.YoutubeDL", return_value=_mock_ydl()):
        r = client.get(
            "/api/youtube/smart-search?subject=Physics&topic=Optics&standard=Class+10",
            headers=auth_headers(USER_A),
        )
    assert r.status_code == 200
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    assert isinstance(items, list)


def test_youtube_smart_search_requires_auth(client):
    r = client.get("/api/youtube/smart-search?subject=Math&topic=Algebra&standard=Class+9")
    assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
#  GET /api/youtube/edu-reels
# ═══════════════════════════════════════════════════════════════════════════════

def test_youtube_edu_reels_success(client):
    with patch("yt_dlp.YoutubeDL", return_value=_mock_ydl()):
        r = client.get("/api/youtube/edu-reels?q=photosynthesis",
                       headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    assert isinstance(items, list)


def test_youtube_edu_reels_missing_query(client):
    r = client.get("/api/youtube/edu-reels", headers=auth_headers(USER_A))
    assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
#  GET /api/youtube/video/{video_id}
# ═══════════════════════════════════════════════════════════════════════════════

def test_youtube_video_info_success(client):
    with patch("yt_dlp.YoutubeDL", return_value=_mock_ydl(MOCK_SINGLE_VIDEO)):
        r = client.get("/api/youtube/video/dQw4w9WgXcQ",
                       headers=auth_headers(USER_A))
    assert r.status_code == 200
    data = r.json()
    assert data is not None


def test_youtube_video_requires_auth(client):
    r = client.get("/api/youtube/video/someVideoId")
    assert r.status_code == 401
