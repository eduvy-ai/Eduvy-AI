"""
AI Router - API endpoints for AI chat proxy.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.ai.schemas import ChatRequest, VisionRequest, VisionResponse
from app.modules.ai.service import AIService

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/chat")
async def chat(data: ChatRequest, current_user: str = Depends(get_current_user)):
    """Process AI chat request with quota enforcement."""
    history = [{"role": m.role, "content": m.content} for m in data.history]
    return await AIService.chat(
        current_user,
        data.prompt,
        data.system_prompt,
        history,
        data.max_tokens,
        data.mode,
    )


@router.post("/vision", response_model=VisionResponse)
async def extract_image_content(data: VisionRequest, current_user: str = Depends(get_current_user)):
    """Extract text/content from an image using AI Vision."""
    return await AIService.extract_image_content(
        current_user,
        data.image_base64,
        data.mime_type,
        data.prompt,
        data.language,
    )


@router.get("/usage")
async def get_usage(current_user: str = Depends(get_current_user)):
    """Get AI usage stats for current user."""
    return await asyncio.to_thread(AIService.get_usage, current_user)
