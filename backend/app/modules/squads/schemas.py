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


class PostDoubt(BaseModel):
    question: str
    subject: str = ""
    display_name: str = "Student"


class PostAnswer(BaseModel):
    content: str
    display_name: str = "Student"


class PatchVerdict(BaseModel):
    ai_verdict: str = ""
    ai_note: str = ""


class StartSession(BaseModel):
    display_name: str = "Student"
    minutes: int = 25
