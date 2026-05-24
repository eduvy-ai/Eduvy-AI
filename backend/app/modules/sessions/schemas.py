"""
Sessions Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class ChatMsg(BaseModel):
    role: str
    content: str


class Draft(BaseModel):
    content: str
    extra: str = ""
