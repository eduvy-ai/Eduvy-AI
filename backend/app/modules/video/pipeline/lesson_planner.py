"""
Lesson Planner — Stage 1 of the two-stage video generation pipeline.
Transforms a topic into a structured lesson plan that guides scene generation.

Inspired by Manimator (arXiv:2507.14306) two-stage pipeline architecture.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.modules.video.pipeline.scene_graph import LessonPlan

logger = logging.getLogger(__name__)

# System prompt for Stage 1: Lesson Planning
LESSON_PLAN_SYSTEM_PROMPT = """<role>
You are an Expert Educational Curriculum Designer. Your job is to create a structured lesson plan that will be converted into an animated educational video.
</role>

<critical_disambiguation>
IMPORTANT: Many words have multiple meanings. You MUST interpret the topic in its EDUCATIONAL context based on the subject and grade level.
Examples of correct interpretation:
- "Python" in Computer Science = programming language (draw: laptop with code editor) — NOT a snake
- "Java" in Computer Science = programming language (draw: coffee cup logo with code) — NOT an island
- "Cell" in Biology = biological cell (draw: cell membrane with nucleus) — NOT a prison cell
- "Table" in Database/Math = data structure (draw: grid with rows and columns) — NOT furniture
- "Root" in Math = square root (draw: √ symbol with equation) — NOT tree root
- "Conductor" in Physics = electrical conductor (draw: copper wire with electrons) — NOT orchestra conductor
- "Revolution" in History = political uprising — NOT circular motion
Always check: given the SUBJECT and GRADE, what does this topic ACTUALLY mean educationally?
</critical_disambiguation>

<instructions>
1. Analyze the topic IN ITS EDUCATIONAL CONTEXT (subject + grade determine meaning)
2. Follow Bloom's Taxonomy: start with recall/understand, build to apply/analyze
3. Apply Mayer's Multimedia Learning: minimize cognitive load, maximize dual coding
4. Identify concrete visual objects that can be DRAWN for each concept
5. Plan for Segmenting: break complex ideas into digestible chunks
6. Output ONLY valid JSON — start with { and end with }
7. Every visual_anchor MUST be unambiguous — include the educational context in the description
   BAD: "python" (ambiguous!)
   GOOD: "a laptop screen showing Python programming code with colorful syntax highlighting"
</instructions>

<output_format>
{
  "topic": "exact topic as given",
  "subject": "subject area (Science/Math/History/etc.)",
  "grade": "target grade level",
  "learning_objectives": [
    "By the end, student will understand X",
    "Student will be able to explain Y"
  ],
  "prerequisite_knowledge": [
    "concept student should already know"
  ],
  "key_concepts": [
    {
      "concept": "concept name",
      "explanation": "1 sentence plain-language explanation",
      "visual_anchor": "the concrete object/scene to draw for this concept",
      "bloom_level": "remember|understand|apply|analyze"
    }
  ],
  "visual_strategy": [
    {
      "scene_purpose": "what this scene teaches",
      "recommended_type": "draw|scene|equation_write|flow_arrows|cycle_loop|etc.",
      "visual_description": "what should appear on screen"
    }
  ],
  "assessment_points": [
    "question to check understanding"
  ],
  "narrative_arc": "opening_hook → build_concept → elaborate → recap"
}
</output_format>

<example>
<input>Topic: Photosynthesis, Grade: Class 7, Subject: Science, Language: English, Duration: 1 min</input>
<output>
{
  "topic": "Photosynthesis",
  "subject": "Science",
  "grade": "Class 7",
  "learning_objectives": [
    "Student will explain how plants make food using sunlight",
    "Student will identify the inputs and outputs of photosynthesis",
    "Student will describe the role of chlorophyll in capturing light"
  ],
  "prerequisite_knowledge": ["Plants need water and sunlight", "Leaves are green"],
  "key_concepts": [
    {"concept": "Sunlight as energy source", "explanation": "Plants capture light energy from the sun to power food-making", "visual_anchor": "sun rays hitting a green leaf surface", "bloom_level": "remember"},
    {"concept": "Chlorophyll", "explanation": "The green pigment in leaves that traps sunlight", "visual_anchor": "cross-section of a leaf showing green chloroplast cells", "bloom_level": "understand"},
    {"concept": "Carbon dioxide + Water → Glucose + Oxygen", "explanation": "Plants combine CO2 from air and H2O from roots to make sugar and release oxygen", "visual_anchor": "a plant with arrows showing CO2 entering leaves and O2 leaving", "bloom_level": "understand"},
    {"concept": "Where it happens", "explanation": "Photosynthesis takes place inside chloroplasts in leaf cells", "visual_anchor": "magnified leaf cell with labeled chloroplasts", "bloom_level": "apply"},
    {"concept": "Why it matters", "explanation": "Photosynthesis produces oxygen we breathe and food chains start here", "visual_anchor": "food chain starting from a plant to animals to humans", "bloom_level": "analyze"}
  ],
  "visual_strategy": [
    {"scene_purpose": "Hook — show the big question", "recommended_type": "draw", "visual_description": "a plant growing in sunlight with a question mark"},
    {"scene_purpose": "Introduce sunlight capture", "recommended_type": "draw", "visual_description": "sun rays hitting leaf surface"},
    {"scene_purpose": "Show chlorophyll", "recommended_type": "annotated_diagram", "visual_description": "leaf cross-section with chloroplasts labeled"},
    {"scene_purpose": "The chemical process", "recommended_type": "flow_arrows", "visual_description": "CO2 + H2O → Glucose + O2 with arrows"},
    {"scene_purpose": "Inside the cell", "recommended_type": "draw", "visual_description": "magnified chloroplast"},
    {"scene_purpose": "Recap importance", "recommended_type": "scene", "visual_description": "icons for oxygen, food, life connected"}
  ],
  "assessment_points": ["What gas do plants release?", "What is the role of chlorophyll?", "Name the inputs of photosynthesis"],
  "narrative_arc": "opening_hook (why are plants green?) → build_concept (sunlight → chlorophyll → reaction) → elaborate (inside the cell) → recap (why it matters)"
}
</output>
</example>

<quality_standards>
- 3-5 learning objectives (measurable, using Bloom's verbs)
- 4-8 key concepts ordered from simple → complex
- Each concept MUST have a concrete visual_anchor (a drawable real-world object)
- visual_strategy should have same count as key_concepts (one scene per concept, plus opening + closing)
- Assessment points: 2-4 check questions
- Use the student's language for all text content
- NEVER use abstract descriptions — always name specific drawable objects
</quality_standards>"""


def _build_user_prompt(topic: str, grade: str, subject: str,
                       language: str, timing: str) -> str:
    """Build the user prompt for lesson planning."""
    return (
        f"Topic: {topic}\n"
        f"Grade: {grade}\n"
        f"Subject: {subject}\n"
        f"Language: {language}\n"
        f"Video Duration: {timing} minutes\n\n"
        f"Create a structured lesson plan for this topic. "
        f"The plan will be converted into an animated video, so focus on "
        f"VISUAL anchors — name specific objects, diagrams, or scenes that "
        f"can be drawn for each concept."
    )


def _get_max_tokens(timing: str) -> int:
    """Scale token budget with video duration."""
    try:
        t = float(timing)
    except (TypeError, ValueError):
        t = 1.0
    if t <= 0.5:
        return 1500
    elif t <= 1.0:
        return 2048
    elif t <= 2.0:
        return 3072
    return 4096


class LessonPlanner:
    """
    Stage 1: Topic → Structured Lesson Plan.
    
    The planner generates a pedagogically sound lesson plan that:
    - Identifies learning objectives (Bloom's Taxonomy)
    - Sequences concepts from simple to complex
    - Maps each concept to a concrete visual anchor
    - Plans the narrative arc for engagement
    """

    @staticmethod
    async def generate(
        topic: str,
        grade: str = "Class 10",
        subject: str = "General",
        language: str = "English",
        timing: str = "1",
    ) -> LessonPlan:
        """
        Generate a structured lesson plan from a topic.
        
        Returns a LessonPlan dataclass that feeds into Stage 2 (ScriptGenerator).
        """
        from services.ai_service import call_ai, _KEY_POOLS, _first_available_provider

        user_prompt = _build_user_prompt(topic, grade, subject, language, timing)
        max_tokens = _get_max_tokens(timing)

        # Build candidate model list (same fallback chain as video service)
        candidates: List[Tuple[str, str]] = []
        if _KEY_POOLS.get("gemini"):
            candidates.append(("gemini", "gemini-2.0-flash"))
        if _KEY_POOLS.get("groq"):
            candidates += [
                ("groq", "llama-3.3-70b-versatile"),
                ("groq", "openai/gpt-oss-20b"),
                ("groq", "llama-3.1-8b-instant"),
            ]
        if not candidates:
            fb = _first_available_provider()
            if fb:
                candidates.append(fb)
            else:
                # Fallback: return a minimal plan so pipeline doesn't break
                logger.error("No AI providers configured for lesson planner")
                return LessonPlan(
                    topic=topic, subject=subject, grade=grade,
                    learning_objectives=[f"Understand {topic}"],
                    key_concepts=[{"concept": topic, "explanation": topic,
                                   "visual_anchor": topic, "bloom_level": "understand"}],
                    visual_strategy=[{"scene_purpose": "Explain topic",
                                     "recommended_type": "draw",
                                     "visual_description": topic}],
                )

        last_err = "unknown"
        for provider, model in candidates:
            repair_context = ""
            for attempt in range(2):  # Self-repair: 2 attempts per model
                try:
                    current_prompt = user_prompt
                    if repair_context:
                        current_prompt += (
                            f"\n\n## FIX REQUIRED — Previous output was invalid:\n"
                            f"{repair_context}\n"
                            f"Output ONLY valid JSON starting with {{ and ending with }}."
                        )

                    response_text, _, _ = await call_ai(
                        provider=provider,
                        model=model,
                        prompt=current_prompt,
                        system_prompt=LESSON_PLAN_SYSTEM_PROMPT,
                        history=[],
                        max_tokens=max_tokens,
                    )
                except Exception as exc:
                    logger.error("Lesson planner AI error [%s/%s]: %s", provider, model, exc)
                    last_err = str(exc)
                    break  # next model

                if response_text.startswith("⚠️"):
                    last_err = response_text.replace("⚠️ ", "").strip()
                    logger.warning("Lesson planner sentinel [%s]: %s", model, last_err)
                    break

                # Parse the response
                parsed = _parse_lesson_plan(response_text, topic, grade, subject)
                if parsed:
                    logger.info("Lesson plan generated [%s]: %d concepts, %d visual strategies",
                               model, len(parsed.key_concepts), len(parsed.visual_strategy))
                    return parsed

                # Self-repair context for retry
                repair_context = (
                    f"Could not parse your output as JSON. "
                    f"First 150 chars: {response_text[:150]}. "
                    f"Ensure you output ONLY a JSON object with key_concepts and visual_strategy arrays."
                )
                last_err = "unparseable lesson plan JSON"
                logger.warning("Lesson plan parse failed [%s] attempt %d, retrying with repair",
                              model, attempt + 1)

        # If all models fail, return minimal plan
        logger.error("Lesson planner failed across all candidates: %s", last_err)
        return LessonPlan(
            topic=topic, subject=subject, grade=grade,
            learning_objectives=[f"Understand {topic}"],
            key_concepts=[{"concept": topic, "explanation": topic,
                           "visual_anchor": topic, "bloom_level": "understand"}],
            visual_strategy=[{"scene_purpose": "Explain topic",
                             "recommended_type": "draw",
                             "visual_description": topic}],
        )


def _parse_lesson_plan(raw: str, topic: str, grade: str, subject: str) -> Optional[LessonPlan]:
    """Parse AI response into a LessonPlan. Returns None on failure."""
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    # Try direct parse
    data = _try_json_parse(cleaned)
    if not data:
        # Try extracting outermost {...}
        m = re.search(r'\{[\s\S]*\}', cleaned)
        if m:
            data = _try_json_parse(m.group(0))

    if not data or not isinstance(data, dict):
        return None

    # Validate minimum structure
    if not data.get("key_concepts") and not data.get("visual_strategy"):
        return None

    # Fill defaults
    data.setdefault("topic", topic)
    data.setdefault("subject", subject)
    data.setdefault("grade", grade)

    return LessonPlan.from_dict(data)


def _try_json_parse(s: str) -> Optional[Dict[str, Any]]:
    """Attempt JSON parse with trailing-comma cleanup."""
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    try:
        cleaned = re.sub(r',(\s*[}\]])', r'\1', s)
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None
