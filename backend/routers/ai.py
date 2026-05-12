from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from services.ai_service import call_ai

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class AIRequest(BaseModel):
    provider: str
    model: str
    prompt: str
    systemPrompt: str
    history: list[Message] = []
    maxTokens: int = Field(default=1200, ge=1, le=16384)
    # Optional: client sends its own key (overrides server .env key)
    apiKey: Optional[str] = None


class AIResponse(BaseModel):
    text: str


@router.post("/ai/chat", response_model=AIResponse)
async def chat(req: AIRequest):
    # Validate provider
    allowed = {"gemini", "groq", "anthropic", "openai"}
    if req.provider not in allowed:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{req.provider}'")

    history = [{"role": m.role, "content": m.content} for m in req.history]

    text = await call_ai(
        provider=req.provider,
        model=req.model,
        prompt=req.prompt,
        system_prompt=req.systemPrompt,
        history=history,
        max_tokens=req.maxTokens,
        api_key=req.apiKey,
    )
    return AIResponse(text=text)
