"""
AI Service - Business logic for AI chat proxy.
"""
from datetime import datetime, timezone
from typing import Dict, Tuple
from fastapi import HTTPException

from app.db.connection import get_db
from services.ai_service import call_ai, resolve_provider_model
from app.modules.ai.prompts import build_system_prompt, VALID_MODES

# Daily call quota per plan
PLANS_QUOTA = {
    "free": 10,
    "basic": 50,
    "pro": 200,
    "premium": 10_000,
}


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _this_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


class AIService:
    """AI chat business logic."""
    
    @staticmethod
    def get_user_info(user_id: str) -> Dict:
        """Get user AI-related info including profile fields for prompt building."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, plan, plan_expires_at, ai_provider, ai_model, ai_admin_override,"
                " name, standard, board, language, subjects"
                " FROM users WHERE id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail="User not found")

            plan = row["plan"] or "free"
            expiry = row["plan_expires_at"] or ""
            if expiry and str(expiry) < _today():
                plan = "free"

            # subjects may be stored as a JSON array string or a list
            subjects = row["subjects"] or []
            if isinstance(subjects, str):
                import json
                try:
                    subjects = json.loads(subjects)
                except Exception:
                    subjects = []

            return {
                "id": user_id,
                "plan": plan,
                "ai_provider": row["ai_provider"] or "gemini",
                "ai_model": row["ai_model"] or "gemini-2.0-flash",
                "ai_admin_override": bool(row["ai_admin_override"]),
                # profile fields for server-side prompt building
                "name": row["name"] or "",
                "standard": row["standard"] or "Class 10",
                "board": row["board"] or "CBSE",
                "language": row["language"] or "English",
                "subjects": subjects,
            }
        finally:
            conn.close()
    
    @staticmethod
    def check_and_increment_usage(user_id: str, plan: str, prompt_tokens: int, completion_tokens: int) -> int:
        """Track usage after AI call. Returns new call count."""
        date = _today()
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO ai_usage (user_id, date, call_count, prompt_tokens, completion_tokens)
                   VALUES (%s, %s, 1, %s, %s)
                   ON CONFLICT (user_id, date)
                   DO UPDATE SET call_count = ai_usage.call_count + 1,
                                 prompt_tokens = ai_usage.prompt_tokens + EXCLUDED.prompt_tokens,
                                 completion_tokens = ai_usage.completion_tokens + EXCLUDED.completion_tokens
                   RETURNING call_count""",
                (user_id, date, prompt_tokens, completion_tokens)
            )
            row = cur.fetchone()
            conn.commit()
            return row["call_count"] if row else 1
        finally:
            conn.close()
    
    @staticmethod
    def check_quota(user_id: str, plan: str) -> Tuple[int, int]:
        """Check if user is within quota. Returns (current_count, limit)."""
        limit = PLANS_QUOTA.get(plan, PLANS_QUOTA["free"])
        date = _today()
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT call_count FROM ai_usage WHERE user_id = %s AND date = %s",
                (user_id, date)
            )
            row = cur.fetchone()
            current = row["call_count"] if row else 0
            return current, limit
        finally:
            conn.close()
    
    @staticmethod
    async def chat(user_id: str, prompt: str, system_prompt: str, history: list, max_tokens: int, mode: str = "") -> Dict:
        """Process AI chat request."""
        user = AIService.get_user_info(user_id)
        plan = user["plan"]

        # When a valid tutor mode is supplied, build the full system prompt
        # server-side from the user's stored profile — the frontend's system_prompt
        # is intentionally ignored so prompt instructions cannot be tampered with.
        if mode in VALID_MODES:
            profile = {
                "name": user["name"],
                "standard": user["standard"],
                "board": user["board"],
                "language": user["language"],
                "subjects": user["subjects"],
            }
            system_prompt = build_system_prompt(profile, mode)

        # Check quota
        current, limit = AIService.check_quota(user_id, plan)
        if current >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily AI quota ({limit} calls) exceeded. Upgrade your plan for more."
            )
        
        # Resolve provider/model
        provider = user["ai_provider"]
        model = user["ai_model"]
        if not user["ai_admin_override"]:
            provider, model = resolve_provider_model(plan, provider, model)
        
        # Call AI
        try:
            response, prompt_tokens, completion_tokens = await call_ai(
                provider=provider,
                model=model,
                prompt=prompt,
                system_prompt=system_prompt,
                history=history,
                max_tokens=max_tokens
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
        
        # Track usage
        new_count = AIService.check_and_increment_usage(user_id, plan, prompt_tokens, completion_tokens)
        
        return {
            "response": response,
            "usage": {
                "calls_today": new_count,
                "daily_limit": limit,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            }
        }
    
    @staticmethod
    def get_usage(user_id: str) -> Dict:
        """Get usage stats for user."""
        user = AIService.get_user_info(user_id)
        plan = user["plan"]
        limit = PLANS_QUOTA.get(plan, PLANS_QUOTA["free"])
        date = _today()
        month = _this_month()
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Today's usage
            cur.execute(
                "SELECT call_count, prompt_tokens + completion_tokens AS tokens FROM ai_usage WHERE user_id = %s AND date = %s",
                (user_id, date)
            )
            today = cur.fetchone()
            today_calls = today["call_count"] if today else 0
            today_tokens = today["tokens"] if today else 0
            
            # Month usage
            cur.execute(
                """SELECT SUM(call_count) AS calls, SUM(prompt_tokens + completion_tokens) AS tokens
                   FROM ai_usage WHERE user_id = %s AND date LIKE %s""",
                (user_id, f"{month}%")
            )
            month_row = cur.fetchone()
            month_calls = month_row["calls"] if month_row and month_row["calls"] else 0
            month_tokens = month_row["tokens"] if month_row and month_row["tokens"] else 0
            
            return {
                "today_calls": today_calls,
                "today_tokens": today_tokens,
                "month_calls": month_calls,
                "month_tokens": month_tokens,
                "daily_limit": limit,
                "plan": plan,
            }
        finally:
            conn.close()
