"""
Home module schemas - Daily Brief and Daily Question.
"""
from pydantic import BaseModel
from typing import Optional


class DailyContentSave(BaseModel):
    """Request to save daily content."""
    content_type: str  # 'brief' or 'dailyq'
    content: str       # JSON string for dailyq, plain text for brief
    language: str = "English"


class DailyContentResponse(BaseModel):
    """Response for daily content."""
    content_type: str
    content: str
    language: str
    date: str
    exists: bool = True
