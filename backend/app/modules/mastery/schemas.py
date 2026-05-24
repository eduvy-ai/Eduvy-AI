"""
Mastery Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class MasteryUpdate(BaseModel):
    subject: str
    score: int  # 0–100
