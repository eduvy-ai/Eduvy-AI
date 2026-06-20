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
    def get_student_progress(user_id: str) -> Dict:
        """Fetch student's mastery scores and quiz accuracy for AI context.
        
        Returns:
            {
                "mastery": {"Math": 75, "Science": 40, ...},
                "quiz_accuracy": {"Math": 80, "Science": 55, ...},
                "weak_topics": ["Science", "English", ...],  # subjects needing help
                "strong_topics": ["Math", ...]  # subjects doing well
            }
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Fetch mastery scores
            cur.execute(
                "SELECT subject, score FROM mastery WHERE user_id = %s",
                (user_id,)
            )
            mastery = {row["subject"]: row["score"] for row in cur.fetchall()}
            
            # Fetch quiz accuracy per subject
            cur.execute(
                """SELECT subject,
                          SUM(total) AS total,
                          SUM(correct) AS correct
                   FROM quiz_results
                   WHERE user_id = %s
                   GROUP BY subject""",
                (user_id,)
            )
            quiz_accuracy = {}
            for row in cur.fetchall():
                total = row["total"] or 0
                correct = row["correct"] or 0
                if total > 0:
                    quiz_accuracy[row["subject"]] = round((correct / total) * 100)
            
            # Determine weak and strong topics
            # Weak: mastery < 50% OR quiz accuracy < 60%
            # Strong: mastery >= 70% AND quiz accuracy >= 70%
            all_subjects = set(mastery.keys()) | set(quiz_accuracy.keys())
            weak_topics = []
            strong_topics = []
            
            for subj in all_subjects:
                m_score = mastery.get(subj, 50)  # default 50 if no data
                q_score = quiz_accuracy.get(subj, 50)  # default 50 if no data
                
                if m_score < 50 or q_score < 60:
                    weak_topics.append(subj)
                elif m_score >= 70 and q_score >= 70:
                    strong_topics.append(subj)
            
            return {
                "mastery": mastery,
                "quiz_accuracy": quiz_accuracy,
                "weak_topics": weak_topics[:3],  # top 3 weak
                "strong_topics": strong_topics[:3],  # top 3 strong
            }
        finally:
            conn.close()
    
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
            # Fetch student progress for personalized teaching
            progress = AIService.get_student_progress(user_id)
            system_prompt = build_system_prompt(profile, mode, progress)
            
            # For regional languages, upgrade to a better model if on free plan
            # Small models (8B) struggle with non-English languages
            upgrade_for_regional = plan == "free" and user["language"] not in ["English", ""]
        else:
            upgrade_for_regional = False

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
        
        # Override for regional languages on free plan (use Gemini for better quality)
        # Gemini handles Indian languages (Hindi, Marathi, Tamil, etc.) much better than Llama
        if upgrade_for_regional:
            provider = "gemini"
            model = "gemini-2.0-flash"
        
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
    async def extract_image_content(
        user_id: str,
        image_base64: str,
        mime_type: str,
        prompt: str,
        language: str
    ) -> Dict:
        """Extract text/content from an image using AI Vision."""
        from services.ai_service import call_vision
        
        user = AIService.get_user_info(user_id)
        plan = user["plan"]
        
        # Check quota
        current, limit = AIService.check_quota(user_id, plan)
        if current >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily AI quota ({limit} calls) exceeded."
            )
        
        # Build extraction prompt
        extraction_prompt = f"""You are analyzing an image uploaded by a Class {user.get('standard', '10')} student in India.

TASK: Extract ALL text and content from this image. This could be:
- Textbook pages, notes, diagrams
- Handwritten notes
- Charts, graphs, tables
- Question papers, worksheets

RESPOND IN {language.upper()}.

OUTPUT FORMAT:
1. First, describe what type of document/image this is (1 line)
2. Then extract ALL readable text, preserving structure
3. If it's a diagram/chart, describe what it shows
4. If text is handwritten, do your best to read it

{prompt if prompt else ''}

IMPORTANT: If this is NOT educational content (social media, memes, random photos, etc.), start your response with "[NOT_EDUCATIONAL]" and briefly explain why."""

        # Call Vision API
        try:
            response, prompt_tokens, completion_tokens = await call_vision(
                image_base64=image_base64,
                mime_type=mime_type,
                prompt=extraction_prompt,
                language=language,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Vision service error: {str(e)}")
        
        # Track usage
        AIService.check_and_increment_usage(user_id, plan, prompt_tokens, completion_tokens)
        
        # Check if educational
        is_educational = not response.startswith("[NOT_EDUCATIONAL]")
        
        # Generate short summary
        summary = ""
        if is_educational and len(response) > 100:
            # Take first 2 sentences as summary
            sentences = response.replace('\n', ' ').split('. ')
            summary = '. '.join(sentences[:2]) + '.' if len(sentences) > 1 else sentences[0]
            summary = summary[:200]
        
        return {
            "content": response,
            "is_educational": is_educational,
            "summary": summary,
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
