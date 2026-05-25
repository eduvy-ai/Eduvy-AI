"""
Squads Router - API endpoints for Study Squads.
"""
import asyncio
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.modules.squads.schemas import (
    SendMessage, SubmitExplanation, PostDoubt, PostAnswer, PatchVerdict, StartSession,
)
from app.modules.squads.service import SquadService

router = APIRouter(prefix="/squads", tags=["Squads"])


@router.get("/mine")
async def get_my_squad(current_user: str = Depends(get_current_user)):
    """Get user's current squad."""
    squad = await asyncio.to_thread(SquadService.get_user_squad, current_user)
    return {"squad": squad}


@router.post("/match")
async def match_squad(current_user: str = Depends(get_current_user)):
    """Match user into a study squad."""
    squad = await asyncio.to_thread(SquadService.match_into_squad, current_user)
    return {"squad": squad}


@router.get("/{squad_id}/messages")
async def get_messages(
    squad_id: int,
    since_id: int = Query(0),
    current_user: str = Depends(get_current_user)
):
    """Get squad messages since a specific ID."""
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    messages = await asyncio.to_thread(SquadService.get_messages, squad_id, since_id)
    return {"messages": messages}


@router.post("/{squad_id}/messages")
async def send_message(
    squad_id: int,
    data: SendMessage,
    current_user: str = Depends(get_current_user)
):
    """Send a message to squad chat."""
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    message = await asyncio.to_thread(
        SquadService.send_message,
        squad_id, current_user, data.content, data.display_name, data.msg_type,
    )
    return message


@router.get("/{squad_id}/members")
async def get_members(
    squad_id: int,
    current_user: str = Depends(get_current_user)
):
    """Get squad members."""
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    squad = await asyncio.to_thread(SquadService.get_user_squad, current_user)
    return {"members": squad.get("members", []) if squad else []}


@router.delete("/{squad_id}/leave")
async def leave_squad(
    squad_id: int,
    current_user: str = Depends(get_current_user)
):
    """Leave a squad."""
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.leave_squad, squad_id, current_user)


# ── Challenges ─────────────────────────────────────────────────

@router.get("/{squad_id}/challenge")
async def get_challenge(squad_id: int, current_user: str = Depends(get_current_user)):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.get_challenge, squad_id)


@router.post("/{squad_id}/challenge/create", status_code=201)
async def create_challenge(squad_id: int, current_user: str = Depends(get_current_user)):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.create_challenge, squad_id, current_user)


@router.post("/{squad_id}/challenge/{challenge_id}/submit")
async def submit_challenge(
    squad_id: int,
    challenge_id: int,
    data: SubmitExplanation,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.submit_challenge,
        squad_id, challenge_id, current_user,
        data.explanation, data.xp_override, data.ai_verdict or "", data.ai_note or "",
    )


# ── Doubts Board ───────────────────────────────────────────────

@router.get("/{squad_id}/doubts/quota")
async def get_doubt_quota(squad_id: int, current_user: str = Depends(get_current_user)):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.get_doubt_quota, squad_id, current_user)


@router.get("/{squad_id}/doubts")
async def get_doubts(squad_id: int, current_user: str = Depends(get_current_user)):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.get_doubts, squad_id)


@router.post("/{squad_id}/doubts", status_code=201)
async def post_doubt(
    squad_id: int,
    data: PostDoubt,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.post_doubt,
        squad_id, current_user, data.question, data.display_name, data.subject,
    )


@router.get("/{squad_id}/doubts/{doubt_id}/answers")
async def get_doubt_answers(
    squad_id: int, doubt_id: int, current_user: str = Depends(get_current_user)
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.get_doubt_answers, squad_id, doubt_id)


@router.post("/{squad_id}/doubts/{doubt_id}/answers", status_code=201)
async def post_answer(
    squad_id: int,
    doubt_id: int,
    data: PostAnswer,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.post_answer, squad_id, doubt_id, current_user,
        data.content, data.display_name,
    )


@router.post("/{squad_id}/doubts/{doubt_id}/answers/{answer_id}/upvote")
async def upvote_answer(
    squad_id: int, doubt_id: int, answer_id: int,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.upvote_answer, squad_id, doubt_id, answer_id, current_user,
    )


@router.patch("/{squad_id}/doubts/{doubt_id}/answers/{answer_id}/verdict")
async def patch_verdict(
    squad_id: int, doubt_id: int, answer_id: int,
    data: PatchVerdict,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.patch_verdict, squad_id, doubt_id, answer_id,
        data.ai_verdict, data.ai_note,
    )


# ── Streak ─────────────────────────────────────────────────────

@router.get("/{squad_id}/streak")
async def get_streak(squad_id: int, current_user: str = Depends(get_current_user)):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.get_squad_streak, squad_id, current_user)


# ── Daily Concept ──────────────────────────────────────────────

@router.get("/{squad_id}/daily")
async def get_daily(squad_id: int, current_user: str = Depends(get_current_user)):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(SquadService.get_daily_concept, squad_id)


@router.post("/{squad_id}/daily/explain")
async def submit_daily(
    squad_id: int,
    data: SubmitExplanation,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.submit_daily_explain,
        squad_id, current_user,
        data.explanation, data.xp_override, data.ai_verdict or "", data.ai_note or "",
    )


# ── Study Session ──────────────────────────────────────────────

@router.post("/{squad_id}/session/start", status_code=201)
async def start_session(
    squad_id: int,
    data: StartSession,
    current_user: str = Depends(get_current_user),
):
    await asyncio.to_thread(SquadService.require_member, squad_id, current_user)
    return await asyncio.to_thread(
        SquadService.start_session, squad_id, current_user, data.display_name, data.minutes,
    )

