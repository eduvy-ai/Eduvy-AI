"""
ai.py — Managed AI proxy endpoint.

POST /api/ai/chat
  - Requires valid student JWT (Authorization: Bearer <token>)
  - Enforces per-plan daily call quota (PLANS_QUOTA)
  - Routes provider/model based on plan (free/basic → cheap model)
  - Tracks calls + tokens in ai_usage table
  - NEVER exposes server API keys to clients

GET /api/ai/usage
  - Returns today's and this-month's usage for the authenticated user
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
from jose import jwt, JWTError
import os

from database import get_db
from services.ai_service import call_ai, resolve_provider_model

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)

_JWT_SECRET    = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# ── Daily call quota per plan ─────────────────────────────────
PLANS_QUOTA = {
    "free":    10,
    "basic":   50,
    "pro":     200,
    "premium": 10_000,   # effectively unlimited, but capped for safety
}


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _get_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    """Decode JWT, load user row, return dict with id + plan."""
    if not creds:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, plan, plan_expires_at FROM users WHERE id = %s", (uid,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="User not found")
        plan = row["plan"] or "free"
        # If plan has expiry and it has passed, fall back to free
        expiry = row["plan_expires_at"] or ""
        if expiry and expiry < _today():
            plan = "free"
        return {"id": uid, "plan": plan}
    finally:
        conn.close()


def _check_and_increment_usage(user_id: str, plan: str,
                                 prompt_tokens: int, completion_tokens: int):
    """
    Called AFTER a successful AI call.
    Upserts today's row in ai_usage.
    Returns the new call_count.
    """
    date = _today()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO ai_usage (user_id, date, call_count, prompt_tokens, completion_tokens)
            VALUES (%s, %s, 1, %s, %s)
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                call_count        = ai_usage.call_count + 1,
                prompt_tokens     = ai_usage.prompt_tokens + EXCLUDED.prompt_tokens,
                completion_tokens = ai_usage.completion_tokens + EXCLUDED.completion_tokens
            RETURNING call_count
            """,
            (user_id, date, prompt_tokens, completion_tokens),
        )
        row = cur.fetchone()
        conn.commit()
        return row["call_count"] if row else 1
    finally:
        conn.close()


def _get_today_call_count(user_id: str) -> int:
    date = _today()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT call_count FROM ai_usage WHERE user_id = %s AND date = %s",
            (user_id, date),
        )
        row = cur.fetchone()
        return row["call_count"] if row else 0
    finally:
        conn.close()


# ── Request / Response models ─────────────────────────────────

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


class AIResponse(BaseModel):
    text: str
    callsUsed: int
    callsLimit: int
    tokensToday: int


# ── Endpoint ──────────────────────────────────────────────────

@router.post("/ai/chat", response_model=AIResponse)
async def chat(req: AIRequest, user: dict = Depends(_get_user)):
    allowed = {"gemini", "groq", "anthropic", "openai"}
    if req.provider not in allowed:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{req.provider}'")

    plan      = user["plan"]
    user_id   = user["id"]
    quota     = PLANS_QUOTA.get(plan, 10)

    # ── Check quota BEFORE the call ──────────────────────────
    current_calls = _get_today_call_count(user_id)
    if current_calls >= quota:
        raise HTTPException(
            status_code=429,
            detail={
                "code":    "DAILY_LIMIT_REACHED",
                "used":    current_calls,
                "limit":   quota,
                "plan":    plan,
                "message": f"Daily limit of {quota} AI calls reached for your {plan.capitalize()} plan. Upgrade for more.",
            },
        )

    # ── Route provider/model by plan ─────────────────────────
    provider, model = resolve_provider_model(plan, req.provider, req.model)

    history = [{"role": m.role, "content": m.content} for m in req.history]

    # ── Call AI (server keys only — no client key) ────────────
    text, prompt_tokens, completion_tokens = await call_ai(
        provider=provider,
        model=model,
        prompt=req.prompt,
        system_prompt=req.systemPrompt,
        history=history,
        max_tokens=req.maxTokens,
        api_key=None,  # always use server key
    )

    # ── Record usage ─────────────────────────────────────────
    new_count = _check_and_increment_usage(user_id, plan, prompt_tokens, completion_tokens)

    # Fetch today's total tokens for the response
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT prompt_tokens + completion_tokens AS total FROM ai_usage WHERE user_id=%s AND date=%s",
            (user_id, _today()),
        )
        row = cur.fetchone()
        tokens_today = row["total"] if row else (prompt_tokens + completion_tokens)
    finally:
        conn.close()

    return AIResponse(
        text=text,
        callsUsed=new_count,
        callsLimit=quota,
        tokensToday=tokens_today,
    )


# ── Usage summary for current user ───────────────────────────

@router.get("/ai/usage")
def get_usage(user: dict = Depends(_get_user)):
    user_id = user["id"]
    today   = _today()
    month   = today[:7]   # YYYY-MM
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT call_count, prompt_tokens, completion_tokens FROM ai_usage WHERE user_id=%s AND date=%s",
            (user_id, today),
        )
        day_row = cur.fetchone() or {"call_count": 0, "prompt_tokens": 0, "completion_tokens": 0}

        cur.execute(
            """SELECT SUM(call_count) AS calls,
                      SUM(prompt_tokens) AS ptok,
                      SUM(completion_tokens) AS ctok
               FROM ai_usage WHERE user_id=%s AND date LIKE %s""",
            (user_id, f"{month}%"),
        )
        mon_row = cur.fetchone() or {}

        quota = PLANS_QUOTA.get(user["plan"], 10)
        return {
            "plan":          user["plan"],
            "daily_quota":   quota,
            "today": {
                "calls":       day_row["call_count"],
                "remaining":   max(0, quota - day_row["call_count"]),
                "tokens":      (day_row["prompt_tokens"] or 0) + (day_row["completion_tokens"] or 0),
            },
            "this_month": {
                "calls":  int(mon_row.get("calls") or 0),
                "tokens": int((mon_row.get("ptok") or 0) + (mon_row.get("ctok") or 0)),
            },
        }
    finally:
        conn.close()
