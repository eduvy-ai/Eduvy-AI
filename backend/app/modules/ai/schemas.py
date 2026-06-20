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
    mode: str = ""
    history: List[ChatMessage] = []
    max_tokens: int = 1024


class VisionRequest(BaseModel):
    """Request to extract content from an image."""
    image_base64: str = Field(..., min_length=100, description="Base64-encoded image data")
    mime_type: str = Field(default="image/png", description="Image MIME type (image/png, image/jpeg, etc.)")
    prompt: str = Field(default="", description="Optional prompt for extraction")
    language: str = Field(default="English", description="Language for response")


class VisionResponse(BaseModel):
    """Response from image content extraction."""
    content: str
    is_educational: bool
    summary: str


class UsageResponse(BaseModel):
    today_calls: int
    today_tokens: int
    month_calls: int
    month_tokens: int
    daily_limit: int
    plan: str
