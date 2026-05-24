"""
Sessions Router - API endpoints for chat sessions and drafts.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.sessions.schemas import ChatMsg, Draft
from app.modules.sessions.service import SessionsService

router = APIRouter(tags=["Sessions"])


# ─── Chat Sessions ────────────────────────────────────────────

@router.get("/chat-session/{user_id}/{session}")
async def get_session(user_id: str, session: str, current_user: str = Depends(get_current_user)):
    """Get chat session messages."""
    return SessionsService.get_chat_session(user_id, current_user, session)


@router.post("/chat-session/{user_id}/{session}", status_code=201)
async def append_message(
    user_id: str,
    session: str,
    data: ChatMsg,
    current_user: str = Depends(get_current_user)
):
    """Append message to chat session."""
    return SessionsService.append_chat_message(user_id, current_user, session, data.role, data.content)


@router.delete("/chat-session/{user_id}/{session}")
async def clear_session(user_id: str, session: str, current_user: str = Depends(get_current_user)):
    """Clear chat session."""
    return SessionsService.clear_chat_session(user_id, current_user, session)


# ─── User Drafts ──────────────────────────────────────────────

@router.get("/draft/{user_id}/{key}")
async def get_draft(user_id: str, key: str, current_user: str = Depends(get_current_user)):
    """Get a draft."""
    return SessionsService.get_draft(user_id, current_user, key)


@router.put("/draft/{user_id}/{key}")
async def save_draft(
    user_id: str,
    key: str,
    data: Draft,
    current_user: str = Depends(get_current_user)
):
    """Save a draft."""
    return SessionsService.save_draft(user_id, current_user, key, data.content, data.extra)


@router.delete("/draft/{user_id}/{key}")
async def delete_draft(user_id: str, key: str, current_user: str = Depends(get_current_user)):
    """Delete a draft."""
    return SessionsService.delete_draft(user_id, current_user, key)
