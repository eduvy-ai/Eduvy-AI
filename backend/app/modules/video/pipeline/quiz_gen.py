"""
Quiz Generator — Creates assessment questions from video lesson content.
Generates multiple-choice and short-answer questions based on the lesson plan.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.modules.video.pipeline.scene_graph import LessonPlan

logger = logging.getLogger(__name__)

QUIZ_SYSTEM_PROMPT = """<role>
You are an Expert Educational Assessment Designer. Create quiz questions that test understanding of the video lesson content. Follow Bloom's Taxonomy for question difficulty progression.
</role>

<instructions>
1. Create questions that test the key concepts from the lesson
2. Mix difficulty levels: 2 easy (recall), 2 medium (understand/apply), 1 hard (analyze)
3. Each MCQ must have exactly 4 options with 1 correct answer
4. Write in the student's language
5. Output ONLY valid JSON
</instructions>

<output_format>
{
  "quiz_title": "Quiz: Topic Name",
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "difficulty": "easy|medium|hard",
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "brief explanation of why this answer is correct"
    }
  ]
}
</output_format>"""


class QuizGenerator:
    """
    Generates quiz questions from lesson plan content.
    Uses AI to create pedagogically sound assessment items.
    """

    @staticmethod
    async def generate(
        lesson_plan: LessonPlan,
        language: str = "English",
        num_questions: int = 5,
    ) -> Dict[str, Any]:
        """
        Generate quiz questions based on the lesson plan.
        
        Args:
            lesson_plan: Structured lesson plan from Stage 1
            language: Target language for questions
            num_questions: Number of questions to generate (3-10)
            
        Returns:
            Dict with quiz_title and questions list
        """
        from services.ai_service import call_ai, _KEY_POOLS, _first_available_provider

        num_questions = max(3, min(10, num_questions))

        user_prompt = (
            f"Topic: {lesson_plan.topic}\n"
            f"Subject: {lesson_plan.subject}\n"
            f"Grade: {lesson_plan.grade}\n"
            f"Language: {language}\n"
            f"Number of questions: {num_questions}\n\n"
            f"Key concepts to test:\n"
        )
        for kc in lesson_plan.key_concepts:
            if isinstance(kc, dict):
                user_prompt += f"- {kc.get('concept', '')}: {kc.get('explanation', '')}\n"

        if lesson_plan.assessment_points:
            user_prompt += "\nAssessment focus areas:\n"
            for ap in lesson_plan.assessment_points:
                user_prompt += f"- {ap}\n"

        # Build candidate models
        candidates: List[Tuple[str, str]] = []
        if _KEY_POOLS.get("gemini"):
            candidates.append(("gemini", "gemini-2.0-flash"))
        if _KEY_POOLS.get("groq"):
            candidates += [
                ("groq", "llama-3.3-70b-versatile"),
                ("groq", "llama-3.1-8b-instant"),
            ]
        if not candidates:
            fb = _first_available_provider()
            if fb:
                candidates.append(fb)
            else:
                return _fallback_quiz(lesson_plan)

        for provider, model in candidates:
            try:
                response_text, _, _ = await call_ai(
                    provider=provider,
                    model=model,
                    prompt=user_prompt,
                    system_prompt=QUIZ_SYSTEM_PROMPT,
                    history=[],
                    max_tokens=2048,
                )
            except Exception as exc:
                logger.error("Quiz gen error [%s/%s]: %s", provider, model, exc)
                continue

            if response_text.startswith("⚠️"):
                continue

            parsed = _parse_quiz(response_text)
            if parsed and parsed.get("questions"):
                logger.info("Quiz generated [%s]: %d questions", model, len(parsed["questions"]))
                return parsed

        logger.warning("Quiz generation failed — returning fallback")
        return _fallback_quiz(lesson_plan)


def _parse_quiz(raw: str) -> Optional[Dict[str, Any]]:
    """Parse AI quiz response."""
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and data.get("questions"):
            return data
    except json.JSONDecodeError:
        pass

    # Try extracting {...}
    m = re.search(r'\{[\s\S]*\}', cleaned)
    if m:
        try:
            data = json.loads(m.group(0))
            if isinstance(data, dict) and data.get("questions"):
                return data
        except json.JSONDecodeError:
            pass

    return None


def _fallback_quiz(lesson_plan: LessonPlan) -> Dict[str, Any]:
    """Generate a minimal quiz when AI is unavailable."""
    questions = []
    for i, kc in enumerate(lesson_plan.key_concepts[:3]):
        if isinstance(kc, dict):
            questions.append({
                "id": i + 1,
                "type": "short_answer",
                "difficulty": "easy",
                "question": f"Explain in your own words: {kc.get('concept', 'this concept')}",
                "explanation": kc.get("explanation", ""),
            })
    return {
        "quiz_title": f"Quiz: {lesson_plan.topic}",
        "questions": questions,
    }
