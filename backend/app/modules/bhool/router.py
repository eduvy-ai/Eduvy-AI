"""
Bhool Router - API endpoints for Bhool Bazaar.
"""
import asyncio
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.modules.bhool.schemas import BhoolCardCreate, BhoolCardUpdate, ReactRequest
from app.modules.bhool.service import BhoolService

router = APIRouter(prefix="/bhool", tags=["Bhool Bazaar"])


@router.post("/cards", status_code=201)
async def create_card(
    data: BhoolCardCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new bhool card."""
    return await asyncio.to_thread(
        BhoolService.create_card,
        user_id=current_user,
        subject=data.subject,
        question=data.question,
        wrong_answer=data.wrong_answer,
        correct_answer=data.correct_answer,
        standard=data.standard,
        why_wrong=data.why_wrong,
        is_published=data.is_published,
    )


@router.get("/cards/mine")
async def get_my_cards(current_user: str = Depends(get_current_user)):
    """Get all my cards."""
    cards = await asyncio.to_thread(BhoolService.get_my_cards, current_user)
    return {"cards": cards}


@router.put("/cards/{card_id}")
async def update_card(
    card_id: str,
    data: BhoolCardUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a bhool card."""
    return await asyncio.to_thread(
        BhoolService.update_card,
        user_id=current_user,
        card_id=card_id,
        subject=data.subject,
        question=data.question,
        wrong_answer=data.wrong_answer,
        correct_answer=data.correct_answer,
        why_wrong=data.why_wrong,
        is_published=data.is_published,
    )


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a bhool card."""
    return await asyncio.to_thread(BhoolService.delete_card, current_user, card_id)


@router.get("/marketplace")
async def get_marketplace(
    subject: str = Query(None),
    standard: str = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: str = Depends(get_current_user)
):
    """Get public cards for marketplace."""
    cards = await asyncio.to_thread(BhoolService.get_marketplace, subject, standard, limit, offset)
    return {"cards": cards}


@router.post("/cards/{card_id}/collect")
async def collect_card(
    card_id: str,
    current_user: str = Depends(get_current_user)
):
    """Collect a card."""
    return await asyncio.to_thread(BhoolService.collect_card, current_user, card_id)


@router.get("/collections")
async def get_collections(current_user: str = Depends(get_current_user)):
    """Get my collected cards."""
    cards = await asyncio.to_thread(BhoolService.get_collected_cards, current_user)
    return {"cards": cards}


@router.get("/marketplace/top")
async def get_top_cards(
    subject: str = Query(None),
    limit: int = Query(20, le=50),
    current_user: str = Depends(get_current_user),
):
    """Get top-collected cards."""
    cards = await asyncio.to_thread(BhoolService.get_top_cards, subject, limit)
    return {"cards": cards}


@router.post("/cards/{card_id}/react")
async def react_to_card(
    card_id: str,
    data: ReactRequest,
    current_user: str = Depends(get_current_user),
):
    """React to a bhool card."""
    return await asyncio.to_thread(BhoolService.react_to_card, current_user, card_id, data.emoji)

