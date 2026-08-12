"""
Coach Schemas - Pydantic models for coach session endpoints.
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class CoachSessionCreate(BaseModel):
    """Request to save a coach session."""
    question: str
    title: str = ""
    subject: str = "General"
    mode: str = "study_coach"
    response_json: dict = {}


class CoachSessionResponse(BaseModel):
    """Single coach session response."""
    id: int
    question: str
    title: str
    subject: str
    mode: str
    response_json: dict
    is_bookmarked: bool
    created_at: str
    
    model_config = {"from_attributes": True}


class CoachSessionListItem(BaseModel):
    """Compact session item for listing."""
    id: int
    question: str
    title: str
    subject: str
    mode: str
    is_bookmarked: bool
    created_at: str
    
    model_config = {"from_attributes": True}


class CoachSessionListResponse(BaseModel):
    """List of coach sessions."""
    sessions: List[CoachSessionListItem]
    total: int


class BookmarkRequest(BaseModel):
    """Toggle bookmark request."""
    is_bookmarked: bool


class SearchRequest(BaseModel):
    """Search sessions request."""
    query: str
    subject: Optional[str] = None
    bookmarked_only: bool = False
    limit: int = 50
