"""
Quiz Stats Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class QuizResult(BaseModel):
    subject: str
    difficulty: str = "Medium"
    correct: int  # 0 or 1 for a single question
    total: int = 1
