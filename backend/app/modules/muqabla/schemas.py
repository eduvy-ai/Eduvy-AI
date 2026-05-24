"""
Muqabla Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import List


class ChallengeCreate(BaseModel):
    subject: str
    difficulty: str = "Medium"  # Easy | Medium | Hard


class AnswerSubmit(BaseModel):
    answers: List[int]
    time_seconds: int = 0
