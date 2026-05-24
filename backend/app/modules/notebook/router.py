"""
Notebook Router - API endpoints for notebook sources and chat.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.notebook.schemas import Source, ChatMessage
from app.modules.notebook.service import NotebookService

router = APIRouter(prefix="/notebook", tags=["Notebook"])


# --- Sources -------------------------------------------------

@router.get("/{user_id}/sources")
async def get_sources(user_id: str, current_user: str = Depends(get_current_user)):
    """Get all notebook sources."""
    return NotebookService.get_sources(user_id, current_user)


@router.post("/{user_id}/sources", status_code=201)
async def add_source(
    user_id: str,
    data: Source,
    current_user: str = Depends(get_current_user)
):
    """Add or update a notebook source."""
    return NotebookService.add_source(
        user_id, current_user,
        data.id, data.name, data.type, data.content, data.icon, data.added_at
    )


@router.delete("/{user_id}/sources/{source_id}")
async def delete_source(
    user_id: str,
    source_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a notebook source."""
    return NotebookService.delete_source(user_id, current_user, source_id)


@router.delete("/{user_id}/sources")
async def clear_sources(user_id: str, current_user: str = Depends(get_current_user)):
    """Clear all notebook sources."""
    return NotebookService.clear_sources(user_id, current_user)


# --- Chat -----------------------------------------------------

@router.get("/{user_id}/chat")
async def get_chat(user_id: str, current_user: str = Depends(get_current_user)):
    """Get chat history."""
    return NotebookService.get_chat(user_id, current_user)


@router.post("/{user_id}/chat", status_code=201)
async def add_chat_message(
    user_id: str,
    data: ChatMessage,
    current_user: str = Depends(get_current_user)
):
    """Add a chat message."""
    return NotebookService.add_chat_message(user_id, current_user, data.role, data.content)


@router.delete("/{user_id}/chat")
async def clear_chat(user_id: str, current_user: str = Depends(get_current_user)):
    """Clear chat history."""
    return NotebookService.clear_chat(user_id, current_user)
