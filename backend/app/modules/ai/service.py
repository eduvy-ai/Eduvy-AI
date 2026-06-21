"""
AI Service - Business logic for AI chat proxy.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Tuple
from fastapi import HTTPException

from app.db.connection import get_db
from services.ai_service import call_ai, resolve_provider_model
from app.modules.ai.prompts import build_system_prompt, VALID_MODES

logger = logging.getLogger(__name__)

# Daily call quota per plan
PLANS_QUOTA = {
    "free": 10,
    "basic": 50,
    "pro": 200,
    "premium": 10_000,
}

# In-progress beat generation cache to prevent duplicates
# Format: {beat_id: asyncio.Future}
_BEAT_GENERATION_LOCKS: Dict[str, asyncio.Future] = {}


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
    
    @staticmethod
    async def study_coach(
        user_id: str,
        question: str,
        mode: str = "study_coach",
        subject_override: str = None,
        chapter_override: str = None,
    ) -> Dict:
        """
        Generate a structured learning experience for the given question.
        
        Args:
            user_id: Authenticated user ID
            question: The question or topic to learn about
            mode: study_coach | study_coach_eli10 | study_coach_exam | study_coach_coding | study_coach_revision
            subject_override: Optional subject context override
            chapter_override: Optional chapter context
        
        Returns:
            Complete StudyCoachResponse dict with all learning sections
        """
        import json
        import re
        
        # Validate mode
        valid_modes = {"study_coach", "study_coach_eli10", "study_coach_exam", "study_coach_coding", "study_coach_revision"}
        if mode not in valid_modes:
            mode = "study_coach"
        
        # Get user info and profile
        user = AIService.get_user_info(user_id)
        plan = user["plan"]
        
        # Check quota
        current, limit = AIService.check_quota(user_id, plan)
        if current >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily AI quota ({limit} calls) exceeded. Upgrade your plan for more."
            )
        
        # Build profile for prompt
        profile = {
            "name": user["name"],
            "standard": user["standard"],
            "board": user["board"],
            "language": user["language"],
            "subjects": user["subjects"],
        }
        
        # Apply overrides
        if subject_override:
            profile["current_subject"] = subject_override
        if chapter_override:
            profile["current_chapter"] = chapter_override
        
        # Fetch student progress for personalization
        progress = AIService.get_student_progress(user_id)
        progress_for_prompt = {
            "weak_areas": progress.get("weak_topics", []),
            "strong_areas": progress.get("strong_topics", []),
        }
        
        # Build system prompt
        system_prompt = build_system_prompt(profile, mode, progress_for_prompt)
        
        if not system_prompt:
            raise HTTPException(status_code=400, detail=f"Invalid Study Coach mode: {mode}")
        
        # Enhance the question with context
        enhanced_prompt = question
        if subject_override:
            enhanced_prompt = f"[Subject: {subject_override}] {question}"
        if chapter_override:
            enhanced_prompt = f"[Chapter: {chapter_override}] {enhanced_prompt}"
        
        # Resolve provider/model
        provider = user["ai_provider"]
        model = user["ai_model"]
        if not user["ai_admin_override"]:
            provider, model = resolve_provider_model(plan, provider, model)
        
        # Use better model for regional languages on free plan
        if plan == "free" and user["language"] not in ["English", ""]:
            provider = "gemini"
            model = "gemini-2.0-flash"
        
        # Call AI
        try:
            response, prompt_tokens, completion_tokens = await call_ai(
                provider=provider,
                model=model,
                prompt=enhanced_prompt,
                system_prompt=system_prompt,
                history=[],
                max_tokens=4096,  # Study Coach needs more tokens for full response
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
        
        # Track usage
        new_count = AIService.check_and_increment_usage(user_id, plan, prompt_tokens, completion_tokens)
        
        # Parse JSON response
        parsed = AIService._parse_study_coach_response(response, mode)
        
        # Add metadata
        parsed["mode"] = mode
        parsed["usage"] = {
            "calls_today": new_count,
            "daily_limit": limit,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        }
        
        return parsed
    
    @staticmethod
    def _extract_fields_manually(response: str) -> Dict:
        """
        Last-resort extraction of fields from malformed JSON using regex.
        Returns None if extraction fails.
        """
        import re
        
        result = {
            "title": "Learning Response",
            "difficulty": "Intermediate",
            "overview": "",
            "key_takeaways": [],
            "diagram": None,
            "real_world_example": "",
            "quiz": [],
            "flashcards": [],
            "exam_notes": [],
            "related_topics": [],
            "next_topic": "",
        }
        
        try:
            # Extract title
            title_match = re.search(r'"title"\s*:\s*"([^"]+)"', response)
            if title_match:
                result["title"] = title_match.group(1)
            
            # Extract difficulty
            diff_match = re.search(r'"difficulty"\s*:\s*"([^"]+)"', response)
            if diff_match:
                result["difficulty"] = diff_match.group(1)
            
            # Extract overview (can be long, so be careful)
            overview_match = re.search(r'"overview"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,', response)
            if overview_match:
                result["overview"] = overview_match.group(1).replace('\\n', '\n').replace('\\"', '"')
            
            # Extract key_takeaways as array of strings
            takeaways_match = re.search(r'"key_takeaways"\s*:\s*\[(.*?)\]', response, re.DOTALL)
            if takeaways_match:
                items = re.findall(r'"((?:[^"\\]|\\.)*)"', takeaways_match.group(1))
                result["key_takeaways"] = [item.replace('\\n', '\n') for item in items[:6]]
            
            # Extract real_world_example
            example_match = re.search(r'"real_world_example"\s*:\s*"((?:[^"\\]|\\.)*)"', response)
            if example_match:
                result["real_world_example"] = example_match.group(1).replace('\\n', '\n')
            
            # Extract next_topic
            next_match = re.search(r'"next_topic"\s*:\s*"([^"]+)"', response)
            if next_match:
                result["next_topic"] = next_match.group(1)
            
            # Extract related_topics
            related_match = re.search(r'"related_topics"\s*:\s*\[(.*?)\]', response, re.DOTALL)
            if related_match:
                items = re.findall(r'"([^"]+)"', related_match.group(1))
                result["related_topics"] = items[:5]
            
            # Extract exam_notes
            notes_match = re.search(r'"exam_notes"\s*:\s*\[(.*?)\]', response, re.DOTALL)
            if notes_match:
                items = re.findall(r'"((?:[^"\\]|\\.)*)"', notes_match.group(1))
                result["exam_notes"] = items[:5]
            
            # Only return if we got meaningful content
            if result["title"] != "Learning Response" or result["overview"]:
                return result
            return None
            
        except Exception:
            return None
    
    @staticmethod
    def _parse_study_coach_response(response: str, mode: str) -> Dict:
        """
        Parse AI response into StudyCoachResponse structure.
        
        Handles:
        - Raw JSON
        - JSON wrapped in markdown code blocks
        - Partial/malformed JSON with graceful defaults
        """
        import json
        import re
        
        # Try to extract JSON from the response
        json_str = response.strip()
        
        # Remove markdown code blocks if present
        if json_str.startswith("```"):
            # Find the JSON inside code blocks
            match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', json_str)
            if match:
                json_str = match.group(1)
            else:
                # Try removing just the backticks
                json_str = re.sub(r'^```(?:json)?\s*', '', json_str)
                json_str = re.sub(r'\s*```$', '', json_str)
        
        # Clean up common JSON issues from AI
        def fix_json(s: str) -> str:
            # Remove trailing commas before ] or }
            s = re.sub(r',\s*]', ']', s)
            s = re.sub(r',\s*}', '}', s)
            # Fix malformed Mermaid arrows (|> -> -->)
            s = re.sub(r'\|>', '-->', s)
            # Fix unescaped newlines in strings (common AI error)
            # Replace actual newlines inside strings with escaped \n
            s = re.sub(r'(?<!\\)\n', '\\n', s)
            return s
        
        def repair_json(s: str) -> str:
            """Attempt to repair malformed JSON by balancing brackets."""
            s = fix_json(s)
            
            # Count brackets to see if they're balanced
            open_braces = s.count('{')
            close_braces = s.count('}')
            open_brackets = s.count('[')
            close_brackets = s.count(']')
            
            # Add missing closing braces/brackets at the end
            if close_braces < open_braces:
                s = s.rstrip()
                # Remove trailing incomplete content after last complete field
                # Look for the last complete key-value pair
                if s.endswith(','):
                    s = s[:-1]
                if s.endswith('"'):
                    # Might be unclosed string, try to close it
                    pass
                s += '}' * (open_braces - close_braces)
            
            if close_brackets < open_brackets:
                # Find position to insert missing ]
                s = s.rstrip()
                s += ']' * (open_brackets - close_brackets)
            
            # Final cleanup
            s = re.sub(r',\s*]', ']', s)
            s = re.sub(r',\s*}', '}', s)
            s = re.sub(r'}\s*]', '}]', s)  # Fix }] spacing
            s = re.sub(r']\s*}', ']}', s)  # Fix ]} spacing
            
            return s
        
        json_str = repair_json(json_str)
        
        # Try to parse JSON
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            # Try to find JSON object in the response and repair it
            match = re.search(r'\{[\s\S]*\}', response)
            if match:
                repaired_json = repair_json(match.group())
                try:
                    data = json.loads(repaired_json)
                except json.JSONDecodeError:
                    # Last resort: try to extract valid fields manually
                    data = AIService._extract_fields_manually(response)
                    if data:
                        return data
                    # Return minimal response on complete failure
                    return {
                        "title": "Learning Response",
                        "difficulty": "Intermediate",
                        "overview": response[:2000] if len(response) > 2000 else response,
                        "key_takeaways": [],
                        "diagram": None,
                        "real_world_example": "",
                        "quiz": [],
                        "flashcards": [],
                        "exam_notes": [],
                        "related_topics": [],
                        "next_topic": "",
                    }
            else:
                return {
                    "title": "Learning Response",
                    "difficulty": "Intermediate",
                    "overview": response[:2000] if len(response) > 2000 else response,
                    "key_takeaways": [],
                    "diagram": None,
                    "real_world_example": "",
                    "quiz": [],
                    "flashcards": [],
                    "exam_notes": [],
                    "related_topics": [],
                    "next_topic": "",
                }
        
        # Normalize and validate the response structure
        result = {
            "title": data.get("title", "Learning Response"),
            "difficulty": data.get("difficulty", "Intermediate"),
            "overview": data.get("overview", ""),
            "key_takeaways": data.get("key_takeaways", []) or [],
            "real_world_example": data.get("real_world_example", ""),
            "quiz": [],
            "flashcards": [],
            "exam_notes": data.get("exam_notes", []) or [],
            "related_topics": data.get("related_topics", []) or [],
            "next_topic": data.get("next_topic", ""),
        }
        
        # Parse diagram
        diagram = data.get("diagram")
        if diagram and isinstance(diagram, dict):
            result["diagram"] = {
                "type": diagram.get("type", "flowchart"),
                "content": diagram.get("content", ""),
            }
        else:
            result["diagram"] = None
        
        # Parse quiz questions
        raw_quiz = data.get("quiz", [])
        if isinstance(raw_quiz, list):
            for q in raw_quiz:
                if isinstance(q, dict) and q.get("question"):
                    result["quiz"].append({
                        "question": q.get("question", ""),
                        "options": q.get("options", [])[:4],
                        "correct_answer": q.get("correct_answer", "A"),
                        "explanation": q.get("explanation", ""),
                    })
        
        # Parse flashcards
        raw_flashcards = data.get("flashcards", [])
        if isinstance(raw_flashcards, list):
            for f in raw_flashcards:
                if isinstance(f, dict) and f.get("front"):
                    result["flashcards"].append({
                        "front": f.get("front", ""),
                        "back": f.get("back", ""),
                    })
        
        # Parse mode-specific fields
        if mode == "study_coach_coding":
            code_examples = data.get("code_examples", [])
            if isinstance(code_examples, list):
                result["code_examples"] = []
                for ex in code_examples:
                    if isinstance(ex, dict) and ex.get("code"):
                        result["code_examples"].append({
                            "language": ex.get("language", "python"),
                            "title": ex.get("title", ""),
                            "code": ex.get("code", ""),
                            "explanation": ex.get("explanation", ""),
                        })
        
        if mode == "study_coach_revision":
            memory_aids = data.get("memory_aids", {})
            if isinstance(memory_aids, dict):
                result["memory_aids"] = {
                    "mnemonics": memory_aids.get("mnemonics", []) or [],
                    "acronyms": memory_aids.get("acronyms", []) or [],
                    "patterns": memory_aids.get("patterns", []) or [],
                }
        
        return result

    @staticmethod
    async def generate_teacher_audio(
        user_id: str,
        content: str,
        section: str = "overview",
        language: str = "English",
        full_lesson: bool = False,
        study_coach_response: dict = None,
    ) -> dict:
        """
        Generate Teacher Mode audio with word-level timing.
        
        Audio files are stored in R2 storage if configured, otherwise locally.
        
        Args:
            user_id: Authenticated user ID
            content: Text content to generate audio for
            section: Section identifier (overview, takeaways, example)
            language: Language for TTS voice
            full_lesson: Whether to generate for full StudyCoach response
            study_coach_response: Complete StudyCoach response (for full_lesson mode)
        
        Returns:
            TeacherAudioResponse dict with beats, timings, and audio URLs
        """
        import os
        import tempfile
        import hashlib
        from app.services.audio_pipeline import generate_tts_with_timing, split_into_beats
        from app.services.r2_storage import r2_storage, StorageLimitExceeded, is_r2_configured
        
        # Get user profile for language preference
        user = AIService.get_user_info(user_id)
        lang = language or user.get("language", "English")
        
        # Create temp directory for local audio generation
        audio_dir = os.path.join(tempfile.gettempdir(), "eduvy_teacher_audio", user_id)
        os.makedirs(audio_dir, exist_ok=True)
        
        # Check if R2 is configured and within limits
        use_r2 = is_r2_configured()
        if use_r2:
            can_store, stats = r2_storage.check_limit(0)
            if not can_store:
                raise HTTPException(
                    status_code=507,
                    detail=f"Storage limit reached: {stats['total_gb']:.2f}GB / {stats['limit_gb']}GB. Please contact support."
                )
        
        beats_list = []
        total_duration_ms = 0
        
        async def process_beat(sec_name: str, beat_text: str, idx: int) -> dict:
            """Generate and optionally upload a single beat with deduplication."""
            content_hash = hashlib.md5(beat_text.encode()).hexdigest()[:8]
            beat_id = f"{sec_name}_{idx}_{content_hash}"
            lock_key = f"{user_id}:{beat_id}"
            
            # Check if already in progress or completed
            if lock_key in _BEAT_GENERATION_LOCKS:
                logger.debug(f"Beat {beat_id} already in progress, waiting...")
                return await _BEAT_GENERATION_LOCKS[lock_key]
            
            # Create a future for this beat
            loop = asyncio.get_event_loop()
            future = loop.create_future()
            _BEAT_GENERATION_LOCKS[lock_key] = future
            
            try:
                # Check if already in R2
                r2_key = f"teacher_audio/{user_id}/{beat_id}.mp3"
                if use_r2 and await r2_storage.exists(r2_key):
                    # Already uploaded, return cached result
                    audio_url = r2_storage.get_url(r2_key)
                    logger.debug(f"Beat {beat_id} already in R2")
                    result_data = {
                        "id": beat_id,
                        "text": beat_text,
                        "audio_url": audio_url,
                        "duration_ms": 5000,  # Estimate
                        "word_timings": [],
                        "section": sec_name,
                        "diagram_id": None,
                    }
                    future.set_result(result_data)
                    return result_data
                
                # Generate audio locally first
                result = await generate_tts_with_timing(
                    text=beat_text,
                    lang=lang,
                    output_dir=audio_dir,
                    beat_id=beat_id,
                )
                
                # Determine audio URL
                if use_r2 and result.get("audio_path"):
                    try:
                        audio_url = await r2_storage.upload_file(
                            file_path=result["audio_path"],
                            key=r2_key,
                            user_id=user_id,
                            content_type="audio/mpeg",
                            category="teacher_audio",
                            delete_local=True,
                        )
                    except StorageLimitExceeded as e:
                        raise HTTPException(
                            status_code=507,
                            detail=f"Storage limit reached: {e.current_gb:.2f}GB / {e.limit_gb:.2f}GB"
                        )
                else:
                    audio_url = f"/api/ai/teacher-audio/{user_id}/{beat_id}"
                
                result_data = {
                    "id": beat_id,
                    "text": beat_text,
                    "audio_url": audio_url,
                    "duration_ms": result["duration_ms"],
                    "word_timings": result["word_timings"],
                    "section": sec_name,
                    "diagram_id": None,
                }
                future.set_result(result_data)
                return result_data
            except Exception as e:
                future.set_exception(e)
                raise
            finally:
                # Clean up lock after a short delay to handle rapid duplicate requests
                async def cleanup():
                    await asyncio.sleep(5)
                    _BEAT_GENERATION_LOCKS.pop(lock_key, None)
                asyncio.create_task(cleanup())
        
        if full_lesson and study_coach_response:
            # Generate audio for all sections in the StudyCoach response
            sections_to_process = []
            
            # Add overview
            if study_coach_response.get("overview"):
                sections_to_process.append(("overview", study_coach_response["overview"]))
            
            # Add key takeaways as one beat
            takeaways = study_coach_response.get("key_takeaways", [])
            if takeaways:
                takeaways_text = "Here are the key points to remember: " + ". ".join(takeaways)
                sections_to_process.append(("takeaways", takeaways_text))
            
            # Add real-world example
            if study_coach_response.get("real_world_example"):
                sections_to_process.append(("example", study_coach_response["real_world_example"]))
            
            # Add exam notes as one beat
            exam_notes = study_coach_response.get("exam_notes", [])
            if exam_notes:
                notes_text = "For exam preparation, remember: " + ". ".join(exam_notes)
                sections_to_process.append(("exam_notes", notes_text))
            
            # Process each section
            for sec_name, sec_content in sections_to_process:
                # Split into beats
                beat_texts = split_into_beats(sec_content, max_sentences=2)
                
                for i, beat_text in enumerate(beat_texts):
                    beat_data = await process_beat(sec_name, beat_text, i)
                    beats_list.append(beat_data)
                    total_duration_ms += beat_data["duration_ms"]
        else:
            # Single section mode
            beat_texts = split_into_beats(content, max_sentences=2)
            
            for i, beat_text in enumerate(beat_texts):
                beat_data = await process_beat(section, beat_text, i)
                beats_list.append(beat_data)
                total_duration_ms += beat_data["duration_ms"]
        
        # Generate cache key for this content
        cache_key = hashlib.md5(f"{user_id}:{content[:100]}:{lang}".encode()).hexdigest()[:12]
        
        return {
            "beats": beats_list,
            "total_duration_ms": total_duration_ms,
            "language": lang,
            "cache_key": cache_key,
        }
