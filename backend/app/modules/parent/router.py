"""
Parent Router - API endpoints for parent dashboard.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.parent.service import ParentService

router = APIRouter(prefix="/parent", tags=["Parent"])


@router.post("/pin", status_code=201)
async def create_or_refresh_pin(current_user: str = Depends(get_current_user)):
    """Generate a new PIN (revokes old one if any)."""
    return await asyncio.to_thread(ParentService.create_or_refresh_pin, current_user)


@router.get("/pin")
async def get_my_pin(current_user: str = Depends(get_current_user)):
    """Get current PIN for authenticated student."""
    return await asyncio.to_thread(ParentService.get_my_pin, current_user)


@router.delete("/pin")
async def revoke_pin(current_user: str = Depends(get_current_user)):
    """Revoke current PIN."""
    return await asyncio.to_thread(ParentService.revoke_pin, current_user)


@router.get("/view/{pin}")
async def parent_view(pin: str):
    """Public endpoint - no auth required. Returns child dashboard data."""
    return await asyncio.to_thread(ParentService.view_child_dashboard, pin)
