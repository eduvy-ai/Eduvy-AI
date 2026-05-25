"""
Notebook Router - API endpoints for notebook sources and chat.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.notebook.schemas import Source, ChatMessage, StudioOutput
from app.modules.notebook.service import NotebookService

router = APIRouter(prefix="/notebook", tags=["Notebook"])


# --- Sources -------------------------------------------------

@router.get("/{user_id}/sources")
async def get_sources(user_id: str, current_user: str = Depends(get_current_user)):
    """Get all notebook sources."""
    return await asyncio.to_thread(NotebookService.get_sources, user_id, current_user)


@router.post("/{user_id}/sources", status_code=201)
async def add_source(
    user_id: str,
    data: Source,
    current_user: str = Depends(get_current_user)
):
    """Add or update a notebook source."""
    return await asyncio.to_thread(
        NotebookService.add_source,
        user_id, current_user,
        data.id, data.name, data.type, data.content, data.icon, data.added_at,
    )


@router.delete("/{user_id}/sources/{source_id}")
async def delete_source(
    user_id: str,
    source_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a notebook source."""
    return await asyncio.to_thread(NotebookService.delete_source, user_id, current_user, source_id)


@router.delete("/{user_id}/sources")
async def clear_sources(user_id: str, current_user: str = Depends(get_current_user)):
    """Clear all notebook sources."""
    return await asyncio.to_thread(NotebookService.clear_sources, user_id, current_user)


# --- Chat -----------------------------------------------------

@router.get("/{user_id}/chat")
async def get_chat(user_id: str, current_user: str = Depends(get_current_user)):
    """Get chat history."""
    return await asyncio.to_thread(NotebookService.get_chat, user_id, current_user)


@router.post("/{user_id}/chat", status_code=201)
async def add_chat_message(
    user_id: str,
    data: ChatMessage,
    current_user: str = Depends(get_current_user)
):
    """Add a chat message."""
    return await asyncio.to_thread(
        NotebookService.add_chat_message, user_id, current_user, data.role, data.content
    )


@router.delete("/{user_id}/chat")
async def clear_chat(user_id: str, current_user: str = Depends(get_current_user)):
    """Clear chat history."""
    return await asyncio.to_thread(NotebookService.clear_chat, user_id, current_user)


# --- Studio --------------------------------------------------

@router.get("/{user_id}/studio")
async def get_studio(user_id: str, current_user: str = Depends(get_current_user)):
    """Get studio outputs."""
    outputs = await asyncio.to_thread(NotebookService.get_studio_outputs, user_id, current_user)
    return outputs


@router.post("/{user_id}/studio", status_code=201)
async def save_studio(
    user_id: str,
    data: StudioOutput,
    current_user: str = Depends(get_current_user),
):
    """Save a studio output."""
    return await asyncio.to_thread(
        NotebookService.save_studio_output,
        user_id, current_user, data.type, data.output_json,
    )

