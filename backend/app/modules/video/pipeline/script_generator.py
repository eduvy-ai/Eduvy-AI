"""
Script Generator — Stage 2 of the two-stage video generation pipeline.
Converts a LessonPlan into a full scene-by-scene video script.

This is the creative stage: it takes the structured plan and produces
the actual narration, visual specifications, and timing for each scene.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.modules.video.pipeline.scene_graph import LessonPlan, SceneGraph

logger = logging.getLogger(__name__)

# System prompt for Stage 2: Script Generation (uses existing video_creator_script
# prompt but augmented with lesson plan context)
SCRIPT_GEN_SYSTEM_PROMPT = """<role>
You are an Expert Video Director creating rich, visually compelling whiteboard explainer videos. You have been given a structured lesson plan — your job is to convert it into a frame-by-frame video script with exact narration and visual specifications.
</role>

<critical_disambiguation>
IMPORTANT: The "draw" scene type generates a REAL image using AI. The "subject" field MUST be an unambiguous physical description of what to draw — NOT just a word.
- WRONG: {"subject": "Python"} ← AI will draw a snake!
- RIGHT: {"subject": "a laptop screen showing Python code with colorful syntax highlighting"}
- WRONG: {"subject": "cell"} ← ambiguous!
- RIGHT: {"subject": "a biological cell with labeled nucleus, membrane, and mitochondria"}
- WRONG: {"subject": "table"} 
- RIGHT: {"subject": "a database table with rows and columns of student data"}

Every draw subject must be a FULL VISUAL DESCRIPTION (10-25 words) of exactly what the image should show. Include the educational context so the AI image generator cannot misinterpret it.
</critical_disambiguation>

<instructions>
1. Follow the lesson plan's concept sequence EXACTLY
2. Each key_concept from the plan becomes 1-2 scenes
3. Add an engaging opening scene (hook) and a recap closing scene
4. Use the visual_anchor from the plan to choose svg_type and svg_data
5. Write narration like a warm, enthusiastic teacher (40-70 words per scene)
6. Write all text content in the student's language
7. Output ONLY the JSON object - start with { and end with }
</instructions>

<scene_types>
PRIMARY (use for most scenes):
- draw: Hand-drawn sketch of a specific object. Give "subject" = the ONE thing to draw.
- scene: Icons + labels + layout for relationships/processes/abstract ideas.
  Icons: sun, cloud, water, leaf, tree, rocket, star, bulb, book, brain, heart, gear, atom, flask, molecule, computer, person, building, globe, coin, clock, target, arrow, check, bolt, chat, chart, search, shield, question
  Layouts: "center", "row", "radial", "grid", "compare"

DIAGRAMS (when they fit):
- equation_write: Formula stroke-by-stroke with labels
- cycle_loop: Circular process (3-5 stages)
- flow_arrows: Linear steps with arrows (2-5)
- timeline_dots: Horizontal timeline (3-6 events)
- tree_hierarchy: Parent → children branching
- venn_two: Two overlapping circles
- radial_web: Central concept with spokes
- bar_chart: Comparative bars
- comparison_table: Two-column table
- annotated_diagram: Labeled scientific figure (diagram_type: cell|atom|heart|leaf|dna|waveform|punnett|gears|flask|magnet|sun|brain|water)

TEXT (use sparingly, max once):
- bullet_reveal: 3-5 bullet points
- title_card: Title + subtitle (opening only)
</scene_types>

<output_format>
{
  "title": "Engaging video title",
  "subject": "subject name",
  "grade": "class level",
  "total_scenes": N,
  "scenes": [
    {
      "id": 0,
      "title": "scene title (5-8 words)",
      "duration_sec": 12,
      "narration": "warm teacher narration (40-70 words)",
      "svg_type": "scene type from list above",
      "accent": "#hex color",
      "svg_data": { ... type-specific data ... },
      "onscreen_text": ["Key point 1", "Key point 2"]
    }
  ]
}
</output_format>

<quality_standards>
- VARIETY: no two consecutive scenes share svg_type+layout
- DRAW the actual thing when narration mentions a concrete object
- Every scene MUST have non-empty narration (40-70 words)
- Accent colors: rotate through #e74c3c, #2980b9, #27ae60, #f39c12, #8e44ad, #16a085
- Opening: use draw or scene (visual hook, not generic title_card)
- Closing: use scene (icon recap) or draw — NOT bullet_reveal
- Each onscreen_text item: max 8 words
- Use topic vocabulary, not generic placeholders
</quality_standards>

<example>
<input>Lesson plan about "Water Cycle" for Class 6, 1 min video, English</input>
<output>
{
  "title": "The Amazing Water Cycle",
  "subject": "Science",
  "grade": "Class 6",
  "total_scenes": 6,
  "scenes": [
    {"id": 0, "title": "Water is always moving", "duration_sec": 10, "narration": "Have you ever wondered where rain comes from? Water is constantly moving in a never-ending cycle between the earth and the sky. Let's explore this incredible journey!", "svg_type": "draw", "accent": "#2980b9", "svg_data": {"subject": "rain falling from clouds into a river and ocean", "label": "The Water Cycle"}, "onscreen_text": ["Water never stops moving", "Earth ↔ Sky"]},
    {"id": 1, "title": "Evaporation lifts water up", "duration_sec": 10, "narration": "When the sun heats water in oceans, rivers, and lakes, the water turns into invisible vapor and rises up into the air. This is called evaporation — the first step of the water cycle.", "svg_type": "draw", "accent": "#f39c12", "svg_data": {"subject": "sun heating an ocean with vapor arrows rising upward", "label": "Evaporation"}, "onscreen_text": ["Sun heats water", "Liquid → Vapor"]},
    {"id": 2, "title": "Condensation forms clouds", "duration_sec": 10, "narration": "As water vapor rises high into the cold atmosphere, it cools down and changes back into tiny water droplets. Millions of these droplets come together to form clouds. This process is condensation.", "svg_type": "draw", "accent": "#8e44ad", "svg_data": {"subject": "water vapor rising and forming fluffy clouds in the sky", "label": "Condensation"}, "onscreen_text": ["Vapor cools down", "Tiny droplets → Clouds"]},
    {"id": 3, "title": "Precipitation brings water down", "duration_sec": 10, "narration": "When clouds get heavy with water droplets, the water falls back to earth as rain, snow, or hail. We call this precipitation — nature's way of watering the planet!", "svg_type": "draw", "accent": "#27ae60", "svg_data": {"subject": "heavy dark clouds releasing rain and snow onto mountains and fields", "label": "Precipitation"}, "onscreen_text": ["Clouds get heavy", "Rain, Snow, Hail"]},
    {"id": 4, "title": "Collection completes the loop", "duration_sec": 10, "narration": "The fallen water collects in rivers, lakes, and oceans. Some seeps underground. And then the sun heats it again, and the whole cycle starts over! It never ends.", "svg_type": "cycle_loop", "accent": "#16a085", "svg_data": {"stages": ["Evaporation", "Condensation", "Precipitation", "Collection"]}, "onscreen_text": ["Water collects again", "Cycle repeats forever"]},
    {"id": 5, "title": "Key ideas recap", "duration_sec": 8, "narration": "Remember: the sun powers evaporation, cooling causes condensation into clouds, gravity brings precipitation, and collection gathers water to start again!", "svg_type": "scene", "accent": "#e74c3c", "svg_data": {"layout": "radial", "focus": "sun", "items": [{"icon": "cloud", "label": "Condense"}, {"icon": "water", "label": "Precipitate"}, {"icon": "globe", "label": "Collect"}], "arrows": true}, "onscreen_text": ["4 steps of water cycle", "Powered by the Sun"]}
  ]
}
</output>
</example>"""


def _build_user_prompt(lesson_plan: LessonPlan, language: str,
                       timing: str, pacing: str) -> str:
    """Build user prompt incorporating the lesson plan from Stage 1."""
    plan_json = json.dumps(lesson_plan.to_dict(), ensure_ascii=False, indent=2)

    # Determine scene count from timing
    try:
        t = float(timing)
    except (TypeError, ValueError):
        t = 1.0

    if t <= 0.5:
        scene_range = "3-4"
    elif t <= 1.0:
        scene_range = "5-7"
    elif t <= 2.0:
        scene_range = "10-13"
    else:
        scene_range = "18-24"

    return (
        f"## LESSON PLAN (from Stage 1)\n"
        f"```json\n{plan_json}\n```\n\n"
        f"## VIDEO PARAMETERS\n"
        f"- Language: {language}\n"
        f"- Duration: {timing} minutes ({scene_range} scenes)\n"
        f"- Pacing: {pacing}\n\n"
        f"Convert this lesson plan into a complete video script. "
        f"Each key_concept should become 1-2 scenes. Use the visual_anchor "
        f"and recommended_type from the plan to guide your svg_type choices. "
        f"Add an engaging visual opening and a recap closing scene."
    )


def _get_max_tokens(timing: str) -> int:
    """Scale token budget with duration."""
    try:
        t = float(timing)
    except (TypeError, ValueError):
        t = 1.0
    if t <= 0.5:
        return 3072
    elif t <= 1.0:
        return 4096
    elif t <= 2.0:
        return 6144
    return 8192


class ScriptGenerator:
    """
    Stage 2: Lesson Plan → Scene-by-scene video script.
    
    Takes the structured lesson plan from Stage 1 and generates the
    actual video content: narration text, visual specifications (svg_type + svg_data),
    timing, and on-screen text for each scene.
    """

    @staticmethod
    async def generate(
        lesson_plan: LessonPlan,
        language: str = "English",
        timing: str = "1",
        pacing: str = "normal",
    ) -> SceneGraph:
        """
        Generate a full video script from a lesson plan.
        
        Returns a SceneGraph with validated scenes ready for rendering.
        """
        from services.ai_service import call_ai, _KEY_POOLS, _first_available_provider

        user_prompt = _build_user_prompt(lesson_plan, language, timing, pacing)
        max_tokens = _get_max_tokens(timing)

        # Build candidate model list
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
                raise ScriptGenerationError(
                    "No AI provider keys configured. Add GROQ_API_KEY or GEMINI_API_KEY."
                )

        last_err = "unknown"
        for provider, model in candidates:
            repair_context = ""  # Self-repair: pass error info on retry
            for attempt in range(3):  # 3 attempts with self-repair
                try:
                    # On retry, augment prompt with repair instructions
                    current_prompt = user_prompt
                    if repair_context:
                        current_prompt += (
                            f"\n\n## IMPORTANT — PREVIOUS ATTEMPT FAILED\n"
                            f"{repair_context}\n"
                            f"Please fix the issue and output ONLY valid JSON."
                        )

                    response_text, _, _ = await call_ai(
                        provider=provider,
                        model=model,
                        prompt=current_prompt,
                        system_prompt=SCRIPT_GEN_SYSTEM_PROMPT,
                        history=[],
                        max_tokens=max_tokens,
                    )
                except Exception as exc:
                    logger.error("Script gen error [%s/%s]: %s", provider, model, exc)
                    last_err = str(exc)
                    break  # next model

                if response_text.startswith("⚠️"):
                    last_err = response_text.replace("⚠️ ", "").strip()
                    logger.warning("Script gen sentinel [%s]: %s", model, last_err)
                    break

                logger.info("Script gen raw [%s] attempt %d (first 300): %s",
                           model, attempt + 1, response_text[:300])

                parsed = _parse_script(response_text)
                if parsed and parsed.get("scenes"):
                    graph = SceneGraph.from_ai_output(parsed)
                    # Auto-repair common scene issues
                    graph.auto_repair(lesson_plan.topic)
                    if graph.scene_count > 0:
                        logger.info("Script generated [%s]: %d scenes, ~%ds total",
                                   model, graph.scene_count, graph.total_duration_sec)
                        return graph

                # Self-repair: build error context for next attempt
                if not parsed:
                    repair_context = (
                        f"Your output was not valid JSON. "
                        f"First 200 chars: {response_text[:200]}\n"
                        f"Error: Could not parse JSON. Ensure output starts with {{ and ends with }}."
                    )
                elif not parsed.get("scenes"):
                    repair_context = (
                        f"Your JSON was parsed but had no 'scenes' array. "
                        f"Keys found: {list(parsed.keys())}. "
                        f"You MUST include a top-level 'scenes' array."
                    )
                else:
                    repair_context = (
                        f"Parsed {len(parsed.get('scenes', []))} scenes but none were valid. "
                        f"Each scene needs: narration, svg_type, svg_data."
                    )
                last_err = f"attempt {attempt + 1}: {repair_context[:100]}"
                logger.warning("Script gen [%s] attempt %d failed, self-repair retry. Error: %s",
                              model, attempt + 1, repair_context[:100])

        raise ScriptGenerationError(f"Could not generate video script ({last_err})")


def _parse_script(raw: str) -> Optional[Dict[str, Any]]:
    """Parse AI script response into dict with 'scenes' key."""
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    result = _try_json(cleaned)
    if result is None:
        m = re.search(r'\{[\s\S]*\}', cleaned)
        if m:
            result = _try_json(m.group(0))

    if result is None or not isinstance(result, dict) or not result.get("scenes"):
        # Try salvaging individual scenes
        result = _salvage_scenes(cleaned)

    # Unwrap nested structure: {"script": {"scenes": [...]}}
    if isinstance(result, dict) and "scenes" not in result:
        for v in result.values():
            if isinstance(v, dict) and "scenes" in v:
                return v

    return result


def _try_json(s: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    try:
        return json.loads(re.sub(r',(\s*[}\]])', r'\1', s))
    except json.JSONDecodeError:
        return None


def _salvage_scenes(text: str) -> Optional[Dict[str, Any]]:
    """Best-effort scene recovery from malformed JSON."""
    arr = re.search(r'"scenes"\s*:\s*\[', text)
    if not arr:
        return None

    title_m = re.search(r'"title"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    scenes = []

    # Find balanced {...} objects after the scenes array opener
    i, n = arr.end(), len(text)
    while i < n:
        while i < n and text[i] != '{':
            i += 1
        if i >= n:
            break
        depth, in_str, esc, j = 0, False, False, i
        while j < n:
            c = text[j]
            if in_str:
                if esc:
                    esc = False
                elif c == '\\':
                    esc = True
                elif c == '"':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            j += 1
        if depth != 0:
            break
        obj_str = text[i:j]
        obj = _try_json(obj_str)
        if isinstance(obj, dict) and ("svg_type" in obj or "narration" in obj):
            scenes.append(obj)
        i = j

    if not scenes:
        return None
    return {"title": title_m.group(1) if title_m else "", "scenes": scenes}


class ScriptGenerationError(Exception):
    pass
