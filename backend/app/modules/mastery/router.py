"""
Mastery Router - API endpoints for subject mastery.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.mastery.schemas import MasteryUpdate
from app.modules.mastery.service import MasteryService

router = APIRouter(prefix="/mastery", tags=["Mastery"])


@router.get("/{user_id}")
async def get_mastery(user_id: str, current_user: str = Depends(get_current_user)):
    """Get mastery scores for all subjects."""
    return MasteryService.get_mastery(user_id, current_user)


@router.put("/{user_id}")
async def set_mastery(
    user_id: str,
    data: MasteryUpdate,
    current_user: str = Depends(get_current_user)
):
    """Set mastery score for a subject."""
    return MasteryService.set_mastery(user_id, current_user, data.subject, data.score)
