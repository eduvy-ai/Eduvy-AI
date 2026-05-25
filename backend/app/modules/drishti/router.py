"""
Drishti Router - API endpoints for helper portal.
"""
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Header

from app.core.dependencies import get_current_user
from app.modules.drishti.schemas import NoteCreate
from app.modules.drishti.service import DrishtiService

router = APIRouter(tags=["Drishti"])


def get_helper(x_helper_token: Optional[str] = Header(default=None, alias="X-Helper-Token")):
    """Dependency: verify helper token."""
    return DrishtiService.get_helper(x_helper_token)


# ── Helper portal endpoints ──────────────────────────────────

@router.get("/helper/me")
async def helper_me(helper: dict = Depends(get_helper)):
    """Get helper profile."""
    return await asyncio.to_thread(DrishtiService.get_helper_me, helper)


@router.get("/helper/students")
async def helper_students(helper: dict = Depends(get_helper)):
    """Get assigned students."""
    return await asyncio.to_thread(DrishtiService.get_students, helper)


@router.post("/helper/notes")
async def send_note(data: NoteCreate, helper: dict = Depends(get_helper)):
    """Send encouragement note to student."""
    return await asyncio.to_thread(DrishtiService.send_note, helper, data.student_id, data.message)


@router.get("/helper/notes/{student_id}")
async def get_notes(student_id: str, helper: dict = Depends(get_helper)):
    """Get notes sent to a student."""
    return await asyncio.to_thread(DrishtiService.get_notes_for_student, helper, student_id)


# ── Student-facing endpoints ─────────────────────────────────

@router.get("/profile/{user_id}/helper-notes")
async def get_student_notes(user_id: str, current_user: str = Depends(get_current_user)):
    """Get unread helper notes for student."""
    if user_id != current_user:
        return []
    return await asyncio.to_thread(DrishtiService.get_student_notes, user_id)


@router.post("/profile/{user_id}/helper-notes/read")
async def mark_notes_read(user_id: str, current_user: str = Depends(get_current_user)):
    """Mark all notes as read."""
    if user_id != current_user:
        return {"marked": 0}
    return await asyncio.to_thread(DrishtiService.mark_notes_read, user_id)
