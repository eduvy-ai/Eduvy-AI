"""
Quiz Stats Router - API endpoints for quiz results.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.quiz_stats.schemas import QuizResult
from app.modules.quiz_stats.service import QuizStatsService

router = APIRouter(prefix="/quiz", tags=["Quiz Stats"])


@router.post("/{user_id}/result", status_code=201)
async def save_quiz_result(
    user_id: str,
    data: QuizResult,
    current_user: str = Depends(get_current_user)
):
    """Save a quiz result."""
    return await asyncio.to_thread(
        QuizStatsService.save_result,
        user_id, current_user,
        data.subject, data.difficulty, data.correct, data.total,
    )


@router.get("/{user_id}/stats")
async def get_quiz_stats(user_id: str, current_user: str = Depends(get_current_user)):
    """Get per-subject quiz stats."""
    return await asyncio.to_thread(QuizStatsService.get_stats, user_id, current_user)
