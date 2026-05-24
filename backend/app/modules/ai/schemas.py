"""
AI Schemas - Request/Response validation models.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    system_prompt: str = ""
    history: List[ChatMessage] = []
    max_tokens: int = 1024


class UsageResponse(BaseModel):
    today_calls: int
    today_tokens: int
    month_calls: int
    month_tokens: int
    daily_limit: int
    plan: str
