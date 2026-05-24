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
