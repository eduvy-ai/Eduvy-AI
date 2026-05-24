"""
Bhool Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import Optional


class BhoolCardCreate(BaseModel):
    subject: str
    standard: str = "Class 10"
    question: str
    wrong_answer: str
    correct_answer: str
    why_wrong: str = ""
    is_published: bool = False


class BhoolCardUpdate(BaseModel):
    subject: Optional[str] = None
    question: Optional[str] = None
    wrong_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    why_wrong: Optional[str] = None
    is_published: Optional[bool] = None


class ReactRequest(BaseModel):
    emoji: str = "same"  # same | clever | tricky | lol
