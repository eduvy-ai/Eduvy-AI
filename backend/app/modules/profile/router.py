"""
Profile Router - API endpoints only.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.profile.schemas import (
    ProfileCreate, ProfileUpdate, XpRequest, StreakRequest, AIConfigRequest
)
from app.modules.profile.service import ProfileService

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("", status_code=201)
async def create_profile(data: ProfileCreate):
    """Create a new user profile."""
    return ProfileService.create_profile(
        id=data.id,
        name=data.name,
        mobile=data.mobile or "",
        parent_mobile=data.parent_mobile or "",
        standard=data.standard,
        board=data.board,
        language=data.language,
        subjects=data.subjects
    )


@router.get("/{user_id}")
async def get_profile(user_id: str, current_user: str = Depends(get_current_user)):
    """Get user profile."""
    ProfileService.require_own(user_id, current_user)
    return ProfileService.get_profile(user_id)


@router.put("/{user_id}")
async def update_profile(
    user_id: str,
    data: ProfileUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user profile."""
    ProfileService.require_own(user_id, current_user)
    return ProfileService.update_profile(
        user_id,
        name=data.name,
        mobile=data.mobile,
        parent_mobile=data.parent_mobile,
        standard=data.standard,
        board=data.board,
        language=data.language,
        display_language=data.display_language,
        subjects=data.subjects,
        school=data.school
    )


@router.post("/{user_id}/xp")
async def add_xp(
    user_id: str,
    data: XpRequest,
    current_user: str = Depends(get_current_user)
):
    """Add XP to user."""
    ProfileService.require_own(user_id, current_user)
    return ProfileService.add_xp(user_id, data.points)


@router.put("/{user_id}/streak")
async def update_streak(
    user_id: str,
    data: StreakRequest,
    current_user: str = Depends(get_current_user)
):
    """Update user streak."""
    ProfileService.require_own(user_id, current_user)
    return ProfileService.update_streak(user_id, data.streak)


@router.put("/{user_id}/ai-config")
async def update_ai_config(
    user_id: str,
    data: AIConfigRequest,
    current_user: str = Depends(get_current_user)
):
    """Update AI configuration."""
    ProfileService.require_own(user_id, current_user)
    return ProfileService.update_ai_config(
        user_id,
        provider=data.provider,
        model=data.model,
        api_key=data.apiKey or "",
        ai_keys=data.aiKeys
    )
