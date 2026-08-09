"""
Chapters Schema - Pydantic models for chapter data.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChapterBase(BaseModel):
    """Base chapter fields."""
    board_id: str = Field(..., description="Education board ID (FK to boards.id)")
    standard_id: str = Field(..., description="Standard ID (FK to standards.id)")
    subject_id: str = Field(..., description="Subject ID (FK to subjects.id)")
    chapter_number: int = Field(..., ge=1, le=30, description="Chapter number in textbook")
    chapter_name: str = Field(..., min_length=2, max_length=200, description="Chapter title")
    chapter_name_local: str = Field("", max_length=300, description="Chapter name in regional language")
    description: Optional[str] = Field(None, max_length=500, description="Brief chapter description")
    topics: Optional[List[str]] = Field(default_factory=list, description="Key topics covered")
    is_active: bool = Field(True, description="Whether chapter is visible")


class ChapterCreate(ChapterBase):
    """Schema for creating a chapter."""
    pass


class ChapterUpdate(BaseModel):
    """Schema for updating a chapter (all fields optional)."""
    chapter_name: Optional[str] = Field(None, min_length=2, max_length=200)
    chapter_name_local: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = Field(None, max_length=500)
    topics: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ChapterResponse(ChapterBase):
    """Schema for chapter response."""
    id: int
    board_name: Optional[str] = None
    standard_name: Optional[str] = None
    subject_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChapterListParams(BaseModel):
    """Query parameters for listing chapters."""
    board_id: Optional[str] = None
    standard_id: Optional[str] = None
    subject_id: Optional[str] = None
    is_active: Optional[bool] = True


class ChapterBulkDelete(BaseModel):
    """Schema for bulk deleting chapters."""
    ids: List[int] = Field(..., min_length=1, description="List of chapter IDs to delete")


class ChapterWithProgress(ChapterResponse):
    """Chapter with user-specific progress data."""
    progress_percent: int = 0
    notes_count: int = 0
    quiz_score: Optional[int] = None
    last_studied: Optional[datetime] = None
