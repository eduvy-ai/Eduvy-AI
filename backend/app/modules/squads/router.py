"""
Squads Router - API endpoints for Study Squads.
"""
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.modules.squads.schemas import SendMessage, SubmitExplanation
from app.modules.squads.service import SquadService

router = APIRouter(prefix="/squads", tags=["Squads"])


@router.get("/mine")
async def get_my_squad(current_user: str = Depends(get_current_user)):
    """Get user's current squad."""
    squad = SquadService.get_user_squad(current_user)
    return {"squad": squad}


@router.post("/match")
async def match_squad(current_user: str = Depends(get_current_user)):
    """Match user into a study squad."""
    squad = SquadService.match_into_squad(current_user)
    return {"squad": squad}


@router.get("/{squad_id}/messages")
async def get_messages(
    squad_id: int,
    since_id: int = Query(0),
    current_user: str = Depends(get_current_user)
):
    """Get squad messages since a specific ID."""
    SquadService.require_member(squad_id, current_user)
    messages = SquadService.get_messages(squad_id, since_id)
    return {"messages": messages}


@router.post("/{squad_id}/messages")
async def send_message(
    squad_id: int,
    data: SendMessage,
    current_user: str = Depends(get_current_user)
):
    """Send a message to squad chat."""
    SquadService.require_member(squad_id, current_user)
    message = SquadService.send_message(
        squad_id,
        current_user,
        data.content,
        data.display_name,
        data.msg_type
    )
    return message


@router.get("/{squad_id}/members")
async def get_members(
    squad_id: int,
    current_user: str = Depends(get_current_user)
):
    """Get squad members."""
    SquadService.require_member(squad_id, current_user)
    squad = SquadService.get_user_squad(current_user)
    return {"members": squad.get("members", []) if squad else []}


@router.delete("/{squad_id}/leave")
async def leave_squad(
    squad_id: int,
    current_user: str = Depends(get_current_user)
):
    """Leave a squad."""
    SquadService.require_member(squad_id, current_user)
    return SquadService.leave_squad(squad_id, current_user)
