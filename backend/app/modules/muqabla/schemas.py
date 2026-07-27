"""
Muqabla Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import List, Optional


class ChallengeCreate(BaseModel):
    subject: str
    difficulty: str = "Medium"  # Easy | Medium | Hard
    opponent_id: Optional[str] = None  # If set, creates a direct challenge


class AnswerSubmit(BaseModel):
    answers: List[int]
    time_seconds: int = 0
