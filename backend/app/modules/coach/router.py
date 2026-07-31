"""
Coach Router - API endpoints for coach session history.
"""
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.modules.coach.schemas import (
    CoachSessionCreate,
    CoachSessionResponse,
    CoachSessionListResponse,
    BookmarkRequest,
    SearchRequest,
)
from app.modules.coach.service import CoachService

router = APIRouter(prefix="/coach", tags=["Coach"])


@router.get("/sessions", response_model=CoachSessionListResponse)
async def get_sessions(
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    subject: str = Query(None),
    bookmarked: bool = Query(False),
    current_user: str = Depends(get_current_user)
):
    """Get user's coach session history."""
    return CoachService.get_sessions(
        current_user, limit, offset, subject, bookmarked
    )


@router.get("/sessions/{session_id}", response_model=CoachSessionResponse)
async def get_session(
    session_id: int,
    current_user: str = Depends(get_current_user)
):
    """Get a specific coach session with full response."""
    return CoachService.get_session(current_user, session_id)


@router.post("/sessions", response_model=CoachSessionResponse)
async def save_session(
    data: CoachSessionCreate,
    current_user: str = Depends(get_current_user)
):
    """Save a new coach session."""
    return CoachService.save_session(
        current_user,
        data.question,
        data.title,
        data.subject,
        data.mode,
        data.response_json
    )


@router.patch("/sessions/{session_id}/bookmark")
async def toggle_bookmark(
    session_id: int,
    data: BookmarkRequest,
    current_user: str = Depends(get_current_user)
):
    """Toggle bookmark status for a session."""
    return CoachService.toggle_bookmark(current_user, session_id, data.is_bookmarked)


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: str = Depends(get_current_user)
):
    """Delete a coach session."""
    return CoachService.delete_session(current_user, session_id)


@router.post("/sessions/search")
async def search_sessions(
    data: SearchRequest,
    current_user: str = Depends(get_current_user)
):
    """Search coach sessions by content."""
    return CoachService.search_sessions(
        current_user,
        data.query,
        data.subject,
        data.bookmarked_only,
        data.limit
    )


@router.get("/subjects")
async def get_subjects(current_user: str = Depends(get_current_user)):
    """Get distinct subjects from user's sessions."""
    subjects = CoachService.get_subjects(current_user)
    return {"subjects": subjects}
