"""
Drawing generation — turn ANY subject into a hand-drawn line sketch.

Two-stage, like a scene-planner → illustrator: the main script picks a `draw`
scene with a `subject`; here a capable LLM DECOMPOSES that subject into simple
primitive shapes (circles, rects, lines, polygons, paths) with coordinates —
the technique that actually works for LLM vector drawing (decompose into parts,
approximate each with a simple shape, arrange them). The renderer then draws
those primitives stroke-by-stroke. Unlimited vocabulary, but reliable rendering.

Colours are NOT chosen by the model (it picks garish ones); the renderer applies
the whiteboard palette. Any failure returns None so the caller falls back to the
icon-composition renderer.

Quality scales with model strength: llama-3.3-70b (Groq free) gives recognizable
but rough sketches; Gemini/GPT-class models are markedly better. The generator
auto-prefers whatever capable provider is configured.
"""
import asyncio
import json
import logging
import re
from typing import List, Optional

from app.modules.ai.prompts import MODE_INSTRUCTIONS

logger = logging.getLogger(__name__)

# In-process cache: subject -> shapes list (re-renders / repeats are instant)
_CACHE: dict = {}

# Few-shot: teach the decomposition style with two worked examples.
_FEWSHOT = [
    {"role": "user", "content": "Draw: a coffee cup"},
    {"role": "assistant", "content": '{"shapes":['
     '{"t":"path","d":"M320 300 L360 520 Q360 560 400 560 L600 560 Q640 560 640 520 L680 300 Z"},'
     '{"t":"ellipse","cx":500,"cy":300,"rx":180,"ry":40},'
     '{"t":"path","d":"M680 340 Q770 340 770 410 Q770 470 660 470"},'
     '{"t":"path","d":"M470 250 Q450 215 470 185"},'
     '{"t":"path","d":"M530 250 Q510 215 530 185"},'
     '{"t":"label","x":500,"y":610,"text":"Coffee"}]}'},
    {"role": "user", "content": "Draw: a fish"},
    {"role": "assistant", "content": '{"shapes":['
     '{"t":"path","d":"M300 310 Q500 200 700 310 Q500 420 300 310 Z"},'
     '{"t":"polygon","points":"700,310 800,240 800,380"},'
     '{"t":"circle","cx":380,"cy":295,"r":13},'
     '{"t":"path","d":"M470 255 Q500 290 470 325"},'
     '{"t":"path","d":"M545 250 Q575 290 545 330"},'
     '{"t":"path","d":"M420 360 Q460 385 520 372"}]}'},
]


def _extract_shapes(text: str) -> Optional[List[dict]]:
    m = re.search(r'\{[\s\S]*\}', text or "")
    if not m:
        return None
    raw = m.group(0)
    for candidate in (raw, re.sub(r',(\s*[}\]])', r'\1', raw)):
        try:
            obj = json.loads(candidate)
            shapes = obj.get("shapes") if isinstance(obj, dict) else None
            if isinstance(shapes, list):
                return shapes
        except json.JSONDecodeError:
            continue
    return None


def _valid(shapes: Optional[List[dict]]) -> bool:
    if not shapes or not isinstance(shapes, list):
        return False
    drawable = [s for s in shapes if isinstance(s, dict) and s.get("t") in
                {"line", "circle", "ellipse", "rect", "polyline", "polygon", "path"}]
    return len(drawable) >= 4


async def generate_drawing(subject: str) -> Optional[List[dict]]:
    """Decompose `subject` into primitive shapes. Returns list or None."""
    subject = (subject or "").strip()
    if not subject:
        return None
    if subject in _CACHE:
        return _CACHE[subject]

    from services.ai_service import call_ai, _KEY_POOLS, _first_available_provider
    # Prefer the strongest configured provider for spatial drawing.
    if _KEY_POOLS.get("gemini"):
        provider, model = "gemini", "gemini-2.0-flash"
    elif _KEY_POOLS.get("groq"):
        provider, model = "groq", "llama-3.3-70b-versatile"
    else:
        fb = _first_available_provider()
        if not fb:
            return None
        provider, model = fb

    system = MODE_INSTRUCTIONS.get("video_drawing", "")

    for attempt in range(2):
        try:
            text, _, _ = await call_ai(
                provider=provider, model=model,
                prompt=f"Draw: {subject}",
                system_prompt=system, history=list(_FEWSHOT),
                max_tokens=2600,
            )
        except Exception as exc:
            logger.warning("drawing_gen: call failed: %s", exc)
            return None
        if text.startswith("⚠️"):
            await asyncio.sleep(1.5)
            continue
        shapes = _extract_shapes(text)
        if _valid(shapes):
            shapes = shapes[:44]  # bound render cost
            _CACHE[subject] = shapes
            logger.info("drawing_gen: '%s' -> %d shapes", subject[:40], len(shapes))
            return shapes
        logger.warning("drawing_gen: invalid shapes for '%s' (attempt %d)", subject[:40], attempt + 1)

    return None
