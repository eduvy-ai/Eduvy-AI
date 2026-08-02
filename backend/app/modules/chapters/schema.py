"""
Chapters Schema - Pydantic models for chapter data.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChapterBase(BaseModel):
    """Base chapter fields."""
    board: str = Field(..., description="Education board (e.g., CBSE, GSEB)")
    standard: str = Field(..., description="Class/grade (e.g., Class 6)")
    subject: str = Field(..., description="Subject name (e.g., Science)")
    chapter_number: int = Field(..., ge=1, le=30, description="Chapter number in textbook")
    chapter_name: str = Field(..., min_length=2, max_length=200, description="Chapter title")
    description: Optional[str] = Field(None, max_length=500, description="Brief chapter description")
    topics: Optional[List[str]] = Field(default_factory=list, description="Key topics covered")
    is_active: bool = Field(True, description="Whether chapter is visible")


class ChapterCreate(ChapterBase):
    """Schema for creating a chapter."""
    pass


class ChapterUpdate(BaseModel):
    """Schema for updating a chapter (all fields optional)."""
    chapter_name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    topics: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ChapterResponse(ChapterBase):
    """Schema for chapter response."""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChapterListParams(BaseModel):
    """Query parameters for listing chapters."""
    board: Optional[str] = None
    standard: Optional[str] = None
    subject: Optional[str] = None
    is_active: Optional[bool] = True


class ChapterWithProgress(ChapterResponse):
    """Chapter with user-specific progress data."""
    progress_percent: int = 0
    notes_count: int = 0
    quiz_score: Optional[int] = None
    last_studied: Optional[datetime] = None
