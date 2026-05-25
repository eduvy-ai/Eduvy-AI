"""
Notebook Schemas - Request/Response validation models.
"""
from pydantic import BaseModel


class Source(BaseModel):
    id: str
    name: str
    type: str = "text"
    content: str = ""
    icon: str = "??"
    added_at: int = 0


class ChatMessage(BaseModel):
    role: str
    content: str


class StudioOutput(BaseModel):
    type: str
    output_json: str = "{}"
