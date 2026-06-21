"""
AI Router - API endpoints for AI chat proxy.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.ai.schemas import (
    ChatRequest,
    VisionRequest,
    VisionResponse,
    StudyCoachRequest,
    StudyCoachResponse,
)
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


@router.post("/study-coach", response_model=StudyCoachResponse)
async def study_coach(data: StudyCoachRequest, current_user: str = Depends(get_current_user)):
    """
    Generate a structured learning experience for a question or topic.
    
    Modes:
    - study_coach: Comprehensive learning experience (default)
    - study_coach_eli10: Explain Like I'm 10 - simple, fun explanations
    - study_coach_exam: Exam prep focus - board exam patterns and tips
    - study_coach_coding: Coding concepts with code examples
    - study_coach_revision: Quick revision with mnemonics and key points
    
    The response adapts to the student's profile (standard, board, medium/language).
    """
    return await AIService.study_coach(
        user_id=current_user,
        question=data.question,
        mode=data.mode,
        subject_override=data.subject_override,
        chapter_override=data.chapter_override,
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
