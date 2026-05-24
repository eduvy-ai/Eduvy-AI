"""
Squads Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import Optional


class SendMessage(BaseModel):
    content: str
    display_name: str = "Student"
    msg_type: str = "chat"


class SubmitExplanation(BaseModel):
    explanation: str
    xp_override: Optional[int] = None
    ai_verdict: Optional[str] = None
    ai_note: Optional[str] = None
