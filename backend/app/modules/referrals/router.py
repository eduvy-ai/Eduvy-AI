"""
Referrals Router - API endpoints for referral system.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.referrals.schemas import ApplyCodeRequest
from app.modules.referrals.service import ReferralsService

router = APIRouter(prefix="/referrals", tags=["Referrals"])


@router.get("/code")
async def get_referral_code(current_user: str = Depends(get_current_user)):
    """Get or generate referral code."""
    return await asyncio.to_thread(ReferralsService.get_referral_code, current_user)


@router.post("/apply")
async def apply_referral_code(data: ApplyCodeRequest, current_user: str = Depends(get_current_user)):
    """Apply a referral code."""
    return await asyncio.to_thread(ReferralsService.apply_referral_code, current_user, data.code)
