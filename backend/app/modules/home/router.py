"""
Home Router - API endpoints for daily content.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.modules.home.schemas import DailyContentSave, DailyContentResponse
from app.modules.home.service import HomeService

router = APIRouter(prefix="/home", tags=["Home"])


@router.get("/daily-content/{content_type}")
async def get_daily_content(
    content_type: str,
    language: str = "English",
    current_user: str = Depends(get_current_user)
):
    """
    Get today's daily content (brief or dailyq).
    Returns null if not generated yet today.
    """
    if content_type not in ("brief", "dailyq"):
        raise HTTPException(status_code=400, detail="Invalid content_type. Use 'brief' or 'dailyq'")
    
    result = await asyncio.to_thread(
        HomeService.get_daily_content,
        current_user,
        content_type,
        language
    )
    
    if not result:
        return {"exists": False, "content": None}
    
    return result


@router.post("/daily-content")
async def save_daily_content(
    data: DailyContentSave,
    current_user: str = Depends(get_current_user)
):
    """
    Save today's daily content after AI generation.
    """
    if data.content_type not in ("brief", "dailyq"):
        raise HTTPException(status_code=400, detail="Invalid content_type. Use 'brief' or 'dailyq'")
    
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    
    result = await asyncio.to_thread(
        HomeService.save_daily_content,
        current_user,
        data.content_type,
        data.content,
        data.language
    )
    
    return result
