"""
Muqabla Router - API endpoints for battles.
"""
import asyncio
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.modules.muqabla.schemas import ChallengeCreate, AnswerSubmit
from app.modules.muqabla.service import MuqablaService

router = APIRouter(prefix="/muqabla", tags=["Muqabla"])


@router.post("/challenge", status_code=201)
async def create_challenge(
    data: ChallengeCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new battle challenge."""
    return await MuqablaService.create_challenge(
        current_user,
        data.subject,
        data.difficulty
    )


@router.post("/battles/{battle_id}/join")
async def join_battle(
    battle_id: int,
    current_user: str = Depends(get_current_user)
):
    """Join an open battle."""
    return await asyncio.to_thread(MuqablaService.join_battle, battle_id, current_user)


@router.delete("/battles/{battle_id}/decline")
async def decline_battle(
    battle_id: int,
    current_user: str = Depends(get_current_user)
):
    """Decline an open battle."""
    return await asyncio.to_thread(MuqablaService.decline_battle, battle_id)


@router.post("/battles/{battle_id}/answer")
async def submit_answers(
    battle_id: int,
    data: AnswerSubmit,
    current_user: str = Depends(get_current_user)
):
    """Submit answers for a battle."""
    return await asyncio.to_thread(
        MuqablaService.submit_answers,
        battle_id, current_user, data.answers, data.time_seconds,
    )


@router.get("/battles/{battle_id}")
async def get_battle(
    battle_id: int,
    current_user: str = Depends(get_current_user)
):
    """Get battle details."""
    return await asyncio.to_thread(MuqablaService.get_battle, battle_id, current_user)


@router.get("/open")
async def get_open_battles(
    limit: int = Query(20, le=50),
    current_user: str = Depends(get_current_user)
):
    """Get open battles to join."""
    battles = await asyncio.to_thread(MuqablaService.get_open_battles, current_user, limit)
    return {"battles": battles}


@router.get("/history")
async def get_history(
    limit: int = Query(50, le=100),
    current_user: str = Depends(get_current_user)
):
    """Get my battle history."""
    battles = await asyncio.to_thread(MuqablaService.get_my_history, current_user, limit)
    return {"battles": battles}


@router.get("/leaderboard")
async def get_leaderboard(limit: int = Query(50, le=100)):
    """Get weekly leaderboard."""
    leaders = await asyncio.to_thread(MuqablaService.get_leaderboard, limit)
    return {"leaders": leaders}
