"""
Fetch Router - API endpoints for web fetching and YouTube.
"""
from fastapi import APIRouter, Query

from app.modules.fetch.schemas import FetchRequest
from app.modules.fetch.service import FetchService

router = APIRouter(tags=["Fetch"])


@router.post("/fetch")
async def fetch_url(data: FetchRequest):
    """Fetch content from URL."""
    return await FetchService.fetch_url(data.url)


@router.get("/youtube/search")
async def youtube_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20)
):
    """Search YouTube videos."""
    results = await FetchService.youtube_search(q, limit)
    return {"results": results}


@router.get("/youtube/smart-search")
async def youtube_smart_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(12, ge=1, le=20),
    max_duration: int = Query(180, ge=30, le=600)
):
    """Smart topic-aware YouTube search."""
    results = await FetchService.youtube_smart_search(q, limit, max_duration)
    return {"results": results}


@router.get("/youtube/edu-reels")
async def youtube_edu_reels(
    q: str = Query(..., min_length=1),
    limit: int = Query(16, ge=1, le=30)
):
    """Fetch educational YouTube Shorts (<=90s) for a query."""
    items = await FetchService.youtube_edu_reels(q, limit)
    return {"items": items}


@router.get("/youtube/video/{video_id}")
async def youtube_video_info(video_id: str):
    """Get info for a specific YouTube video by ID."""
    return await FetchService.youtube_video_info(video_id)


@router.post("/fetch-url")
async def fetch_url_alias(data: FetchRequest):
    """Alias for /fetch — fetch content from a URL."""
    return await FetchService.fetch_url(data.url)
