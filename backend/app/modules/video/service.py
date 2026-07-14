"""
Video Module — Business logic layer.
Orchestrates AI script generation → frame insertion → background rendering.
"""
import asyncio
import json
import logging
import os
import re
import secrets
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.db.connection import get_db
from app.modules.video.exceptions import VideoNotFoundException, VideoGenerationError
from app.modules.video.schemas import VideoGenerateRequest
from app.modules.video import query as q
from app.modules.ai.prompts import MODE_INSTRUCTIONS, LANG_RULES
from services.ai_service import call_ai

logger = logging.getLogger(__name__)


# ── Resilient JSON parsing for AI script output ────────────────────────────────
# Local LLMs occasionally emit slightly malformed JSON (trailing commas, a stray
# brace/quote inside one scene, or a truncated tail). Rather than fail the whole
# video, we recover every well-formed scene we can.

def _loose_loads(s: str):
    """json.loads, retried once with trailing commas stripped. None on failure."""
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    try:
        return json.loads(re.sub(r',(\s*[}\]])', r'\1', s))
    except json.JSONDecodeError:
        return None


def _iter_balanced_objects(text: str, start: int):
    """Yield (obj_str, end_index) for each top-level {...} at/after `start`,
    resyncing to the next '{' when one can't be balanced. Continues past stray
    ']' (from an orphaned array left by a malformed scene) — non-scene objects
    are filtered out by the caller. Stops only when no '{' remains or the tail
    is truncated mid-object."""
    i, n = start, len(text)
    while i < n:
        # advance to the next object opener
        while i < n and text[i] != '{':
            i += 1
        if i >= n:
            return
        depth, in_str, esc, j, closed = 0, False, False, i, False
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
                    closed = True
                    j += 1
                    break
            j += 1
        if not closed:
            return  # truncated final object — nothing more to recover
        yield text[i:j], j
        i = j


def _salvage_scenes(text: str):
    """Best-effort recovery: pull top-level metadata + every parseable scene from
    the scenes array, skipping any single malformed scene. Returns a dict or None."""
    arr = re.search(r'"scenes"\s*:\s*\[', text)
    if not arr:
        return None
    title_m = re.search(r'"title"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    scenes = []
    for obj_str, end in _iter_balanced_objects(text, arr.end()):
        obj = _loose_loads(obj_str)
        # keep only things that actually look like a scene
        if isinstance(obj, dict) and ("svg_type" in obj or "narration" in obj):
            scenes.append(obj)
    if not scenes:
        return None
    return {"title": title_m.group(1) if title_m else "", "scenes": scenes}


# ── Deterministic scene normalization ─────────────────────────────────────────
# The two things the user kept hitting are fixed here in CODE (not the prompt),
# because the weak fallback models (used once the 70B's daily token quota is spent)
# ignore prompt nuance:
#   1. Every video opened with the SAME title_card and closed with the SAME
#      bullet list — both renderers draw an identical picture for every topic.
#      → force a topic-specific `draw` opening + a distinct icon `scene` recap.
#   2. Some scenes came back with no `narration` (or narration under a different
#      key), so those scenes rendered as SILENCE → "audio not coming".
#      → resolve narration from alt keys and synthesize a fallback if still empty.
# These run regardless of which model answered, so the outcome is always correct.

# Text-only renderers that look the same in every video — never use them for the
# opening or closing.
_GENERIC_TYPES = {"", "title_card", "bullet_reveal", "paragraph_reveal"}
# Keys a model might use instead of "narration".
_ALT_NARRATION_KEYS = ("narration", "voiceover", "voice_over", "narration_text",
                        "script", "text", "speech", "vo", "voice", "say")
# Icons known to exist in svg_renderer._ICONS. The recap centers on a distinct
# focus icon and rotates the rest for the surrounding key-idea items (so the
# centre never duplicates a spoke). Focus + layout are chosen per topic so the
# closing scene doesn't look identical across every video.
_RECAP_FOCI = ("target", "brain", "star", "chart")
_RECAP_LAYOUTS = ("radial", "grid", "row")
_RECAP_ICONS = ("bulb", "star", "check", "gear", "rocket", "heart")
_LABEL_STOPWORDS = {
    "the", "a", "an", "of", "and", "to", "in", "on", "how", "why", "what", "is",
    "are", "for", "with", "introduction", "intro", "overview", "basics", "understanding",
}


def _clean_subject(raw: Any) -> str:
    """Turn a topic/title into a concise, drawable subject phrase (the bare
    object, without framing words like 'Introduction to' or 'How ... works')."""
    s = re.sub(r"\s+", " ", str(raw or "")).strip()
    s = re.split(r"\s*[-–—:|]\s*", s)[0].strip()       # drop trailing "— explained"
    s = re.sub(r"^(introduction to|intro to|overview of|understanding|"
               r"the basics of|basics of|how does|how do|how|why does|why do|why|"
               r"what is|what are|what)\s+", "", s, flags=re.I)
    s = re.sub(r"^(the|a|an)\s+", "", s, flags=re.I)    # drop leading article
    s = re.sub(r"\s+(works|work|explained|for beginners)$", "", s, flags=re.I)
    return s[:60] or "the main idea"


def _short_label(raw: Any, max_words: int = 2) -> str:
    """A 1-2 word label for a recap icon, keeping native scripts intact."""
    # Latin/digits + Devanagari, Gujarati, Tamil, Telugu, Kannada, Bengali blocks
    words = re.findall(
        r"[A-Za-z0-9ऀ-ॿ઀-૿஀-௿"
        r"ఀ-౿ಀ-೿ঀ-৿]+",
        str(raw or ""))
    kept = [w for w in words if w.lower() not in _LABEL_STOPWORDS] or words
    return " ".join(kept[:max_words])[:18]


def _resolve_narration(scene: Dict[str, Any], fallback_subject: str) -> str:
    """Return a non-empty narration string for a scene, synthesizing one if needed."""
    for k in _ALT_NARRATION_KEYS:
        v = scene.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    # Last resort: build a spoken line from the title + on-screen text so the
    # scene is never silent.
    bits: List[str] = []
    if isinstance(scene.get("title"), str) and scene["title"].strip():
        bits.append(scene["title"].strip())
    ost = scene.get("onscreen_text") or scene.get("onscreen") or []
    if isinstance(ost, list):
        bits += [str(x).strip() for x in ost if str(x).strip()]
    line = ". ".join(dict.fromkeys(bits))[:240]
    return line or f"Let's look at {fallback_subject}."


def _normalize_scenes(scenes: List[Dict[str, Any]], topic: str,
                      subject: Optional[str]) -> List[Dict[str, Any]]:
    """Guarantee narration on every scene and a varied, topic-specific
    opening + closing. Mutates and returns the scene list."""
    if not scenes:
        return scenes
    main_subject = _clean_subject(subject or topic)

    # 1) Narration on every scene → guarantees the video has voice.
    for sc in scenes:
        if isinstance(sc, dict):
            sc["narration"] = _resolve_narration(sc, main_subject)

    # 2) Opening: a hand-drawn sketch of the actual subject, never the generic
    #    title card. This makes every video open with a different picture.
    first = scenes[0]
    if str(first.get("svg_type") or "").strip() in _GENERIC_TYPES:
        subj = main_subject or _clean_subject(first.get("title"))
        first["svg_type"] = "draw"
        first["svg_data"] = {"subject": subj, "label": _short_label(subj, 3)}

    # 3) Closing: an icon recap of the key ideas — a different renderer from the
    #    opening drawing and unique to this topic. Only replace generic text
    #    endings (title_card / bullet list); keep a model's richer ending as-is.
    if len(scenes) >= 2:
        last = scenes[-1]
        if str(last.get("svg_type") or "").strip() in _GENERIC_TYPES:
            labels: List[str] = []
            for sc in scenes[1:-1] or scenes[:-1]:
                lab = _short_label(sc.get("title") or "")
                if lab and lab not in labels:
                    labels.append(lab)
                if len(labels) >= 4:
                    break
            if not labels:
                labels = [_short_label(main_subject) or "Key idea"]
            items = [{"icon": _RECAP_ICONS[i % len(_RECAP_ICONS)], "label": lab}
                     for i, lab in enumerate(labels)]
            # Choose the recap's layout + focus icon deterministically from the
            # topic, so different videos get structurally different endings (not
            # just different labels). Stable across runs — no PYTHONHASHSEED.
            seed = sum(ord(c) for c in (main_subject or "x"))
            focus = _RECAP_FOCI[seed % len(_RECAP_FOCI)]
            # If the opening is itself an icon scene, force a grid so the two
            # icon scenes never look alike; otherwise vary by topic.
            layout = ("grid" if str(first.get("svg_type")) == "scene"
                      else _RECAP_LAYOUTS[(seed // 4) % len(_RECAP_LAYOUTS)])
            last["svg_type"] = "scene"
            last["svg_data"] = {"layout": layout, "focus": focus,
                                "items": items, "arrows": layout == "row"}
    return scenes


# ── Plan limits ───────────────────────────────────────────────────────────────
PLAN_VIDEO_LIMITS = {
    "free":    2,
    "basic":   10,
    "pro":     30,
    "premium": 999,
}


def _get_user_plan(user_id: str) -> str:
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT plan FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        return (row["plan"] if row else "free") or "free"
    finally:
        conn.close()


def _save_project(project_data: Dict[str, Any], scenes: List[Dict[str, Any]]) -> Dict[str, Any]:
    conn = get_db()
    try:
        q.insert_video_project(conn, project_data)
        for idx, scene in enumerate(scenes):
            frame_data = {
                "video_id": project_data["id"],
                "frame_index": idx,
                "narration": scene.get("narration", ""),
                "svg_spec": json.dumps({
                    "type": scene.get("svg_type", "bullet_reveal"),
                    "title": scene.get("title", ""),
                    "data": scene.get("svg_data", {}),
                    "onscreen_text": scene.get("onscreen_text", []),
                    "duration_sec": scene.get("duration_sec", 10),
                    # Pass per-scene accent color and extra fields from AI
                    "accent": scene.get("accent", ""),
                }),
            }
            q.insert_video_frame(conn, frame_data)
        q.update_video_status(conn, project_data["id"], "queued", frame_count=len(scenes))
        return q.get_video_project(conn, project_data["id"], project_data["user_id"])
    finally:
        conn.close()


class VideoService:

    @staticmethod
    async def start_generation(request: VideoGenerateRequest, user_id: str) -> Dict[str, Any]:
        """
        1. Enforce plan limits
        2. Check R2 storage limit
        3. Call AI to generate the script
        4. Persist project + frames to DB
        5. Return project dict (status='queued') — rendering runs in background
        """
        # Check R2 storage limit before starting video generation
        from app.services.r2_storage import is_r2_configured, get_r2_storage_stats
        if is_r2_configured():
            stats = get_r2_storage_stats()
            if stats["is_limit_reached"]:
                raise HTTPException(
                    status_code=507,
                    detail=f"Storage limit reached: {stats['total_gb']:.2f}GB / {stats['limit_gb']}GB. Cannot create new videos."
                )
            # Warn if approaching limit (videos are typically 5-50MB each)
            if stats["remaining_gb"] < 0.1:  # Less than 100MB remaining
                raise HTTPException(
                    status_code=507,
                    detail=f"Storage nearly full: only {stats['remaining_gb']*1000:.0f}MB remaining. Please delete some files."
                )
        
        plan = await asyncio.to_thread(_get_user_plan, user_id)

        def _count():
            conn = get_db()
            try:
                return q.count_user_videos(conn, user_id)
            finally:
                conn.close()

        existing_count = await asyncio.to_thread(_count)
        limit = PLAN_VIDEO_LIMITS.get(plan, 2)
        if existing_count >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Video limit reached for your plan ({limit} videos). Upgrade to create more."
            )

        script_scenes = await VideoService._call_ai_for_script(request, plan)
        title = script_scenes.get("title", request.topic[:60])

        # Guarantee narration on every scene + a varied, topic-specific opening and
        # closing (so no two videos share the same generic title-card / bullet
        # ending, and no scene is silent). Model-independent — see _normalize_scenes.
        scenes = _normalize_scenes(
            script_scenes.get("scenes", []) or [],
            request.topic,
            script_scenes.get("subject"),
        )

        video_id = str(uuid.uuid4())
        project_data = {
            "id": video_id,
            "user_id": user_id,
            "title": title,
            "topic": request.topic,
            "engine": request.engine,
            "style_variant": request.style_variant,
            "narration_language": request.narration_language,
            "onscreen_language": request.onscreen_language,
            "orientation": request.orientation,
            "pacing": request.pacing,
            "timing": request.timing,
            "script_json": json.dumps(scenes),
            "bg_music": request.bg_music,
            "voice_instructions": request.voice_instructions,
            "enable_captions": request.enable_captions,
        }
        return await asyncio.to_thread(_save_project, project_data, scenes)

    @staticmethod
    async def _call_ai_for_script(request: VideoGenerateRequest, plan: str) -> Dict[str, Any]:
        """Call AI service to generate the video script JSON."""
        mode_instr = MODE_INSTRUCTIONS.get("video_creator_script", "")
        lang_key = request.narration_language
        lang_rule = LANG_RULES.get(lang_key, LANG_RULES.get("English", ""))
        system_prompt = f"{mode_instr}\n\n{lang_rule}"

        user_prompt = (
            f"Topic: {request.topic}\n"
            f"Grade: {request.grade}\n"
            f"Subject: {request.subject}\n"
            f"Language: {request.narration_language}\n"
            f"Pacing: {request.pacing}\n"
            f"Duration: {request.timing} minutes"
        )

        # Candidate models tried in order. Groq rate limits are PER-MODEL, so when
        # the 70B's daily token quota is spent, its siblings (gpt-oss-20b, 8b-instant)
        # still have their own fresh budgets — this keeps video generation working
        # instead of 500-ing the moment one model's daily cap is reached.
        from services.ai_service import _KEY_POOLS, _first_available_provider
        candidates: List[tuple] = []
        if _KEY_POOLS.get("gemini"):
            candidates.append(("gemini", "gemini-2.0-flash"))
        if _KEY_POOLS.get("groq"):
            candidates += [
                ("groq", "llama-3.3-70b-versatile"),  # best quality
                ("groq", "openai/gpt-oss-20b"),       # separate quota, strong JSON
                ("groq", "llama-3.1-8b-instant"),     # separate quota, fast fallback
            ]
        if not candidates:
            fb = _first_available_provider()
            if fb:
                candidates.append(fb)
            else:
                raise VideoGenerationError(
                    "No AI provider keys are configured. Add a GROQ_API_KEY or "
                    "GEMINI_API_KEY via the admin panel."
                )

        # Scale token budget with duration. Scene svg_data is now compact
        # (draw = {subject,label}, scene = small icon list), so these caps fit the
        # JSON comfortably while keeping each call well under Groq's 12k-tokens/min
        # limit — two back-to-back calls no longer blow the per-minute budget.
        try:
            timing_float = float(request.timing)
        except (TypeError, ValueError):
            timing_float = 1.0
        if timing_float <= 0.5:
            max_tokens = 3072
        elif timing_float <= 1.0:
            max_tokens = 4096
        elif timing_float <= 2.0:
            max_tokens = 6144
        else:
            max_tokens = 8192  # 4 min → up to 24 compact scenes

        # Call the model, retrying once if it returns the transient ⚠️ sentinel
        # (rate limit / timeout). The ⚠️ prefix is set by call_ai().
        # Generate + parse with up to 3 attempts. Local LLMs occasionally emit
        # malformed JSON or a transient ⚠️ sentinel; since both are intermittent,
        # regenerating almost always succeeds — far better than a hard 500.
        last_err = "unknown error"
        for (provider, model) in candidates:
            for gen_attempt in range(2):  # up to 2 tries per model, then next model
                try:
                    response_text, _, _ = await call_ai(
                        provider=provider,
                        model=model,
                        prompt=user_prompt,
                        system_prompt=system_prompt,
                        history=[],
                        max_tokens=max_tokens,
                    )
                except Exception as exc:
                    logger.error("AI script gen error [%s/%s]: %s", provider, model, exc)
                    last_err = str(exc)
                    break  # try next candidate model

                # ⚠️ sentinel = rate-limited / unavailable → jump to next model,
                # which on Groq has its own separate daily token quota.
                if response_text.startswith("⚠️"):
                    last_err = response_text.replace("⚠️ ", "").strip()
                    logger.warning("AI sentinel [%s]: %s — trying next model", model, last_err)
                    break

                logger.info("AI raw [%s] (first 500 chars): %s", model, response_text[:500])

                cleaned = response_text.strip()
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
                cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
                cleaned = cleaned.strip()

                # Parse: whole string → outermost {...} → salvage scene-by-scene
                result = _loose_loads(cleaned)
                if result is None:
                    m = re.search(r'\{[\s\S]*\}', cleaned)
                    if m:
                        result = _loose_loads(m.group(0))
                if result is None or (isinstance(result, dict) and not result.get("scenes")):
                    salvaged = _salvage_scenes(cleaned)
                    if salvaged and salvaged.get("scenes"):
                        logger.warning("AI JSON malformed — salvaged %d scene(s)",
                                       len(salvaged["scenes"]))
                        result = salvaged

                # Some models wrap the output under a key like {"script": {...}}
                if isinstance(result, dict) and "scenes" not in result:
                    for v in result.values():
                        if isinstance(v, dict) and "scenes" in v:
                            result = v
                            break

                if isinstance(result, dict) and result.get("scenes"):
                    return result

                last_err = "unparseable or empty script JSON"
                logger.warning("AI parse failed [%s] attempt %d; retry/next. Head: %s",
                               model, gen_attempt + 1, response_text[:200])

        logger.error("AI script generation failed across all candidates: %s", last_err)
        raise VideoGenerationError(f"Could not generate script ({last_err})")

    @staticmethod
    async def get_status(video_id: str, user_id: str) -> Dict[str, Any]:
        """Return video project status + frame progress."""
        def _fetch():
            conn = get_db()
            try:
                project = q.get_video_project(conn, video_id, user_id)
                if not project:
                    return None, 0
                done_frames = q.count_frames_by_status(conn, video_id, "done")
                return project, done_frames
            finally:
                conn.close()

        project, done_frames = await asyncio.to_thread(_fetch)
        if not project:
            raise VideoNotFoundException(video_id)

        return {
            "id": project["id"],
            "status": project["status"],
            "title": project["title"],
            "frame_count": project.get("frame_count", 0),
            "processed_frames": done_frames,
            "file_path": project.get("file_path", ""),
            "thumb_path": project.get("thumb_path", ""),
            "share_token": project.get("share_token", ""),
            "duration_sec": project.get("duration_sec", 0),
            "error_msg": project.get("error_msg", ""),
        }

    @staticmethod
    async def get_library(user_id: str, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        def _fetch():
            conn = get_db()
            try:
                videos = q.list_user_videos(conn, user_id, limit=limit, offset=offset)
                total = q.count_user_videos(conn, user_id)
                return {"videos": videos, "total": total}
            finally:
                conn.close()

        return await asyncio.to_thread(_fetch)

    @staticmethod
    async def delete_video(video_id: str, user_id: str) -> bool:
        from app.services.r2_storage import r2_storage, is_r2_configured
        
        def _delete():
            conn = get_db()
            try:
                project = q.get_video_project(conn, video_id, user_id)
                if not project:
                    return None
                # Delete local files if they exist
                for path_key in ("file_path", "thumb_path"):
                    path = project.get(path_key, "")
                    # Only delete local files (not R2 URLs)
                    if path and not path.startswith("http") and os.path.exists(path):
                        try:
                            os.remove(path)
                        except OSError:
                            pass
                frames = q.get_video_frames(conn, video_id)
                for frame in frames:
                    fp = frame.get("frame_path", "")
                    if fp and os.path.exists(fp):
                        try:
                            os.remove(fp)
                        except OSError:
                            pass
                return q.delete_video_project(conn, video_id, user_id)
            finally:
                conn.close()

        result = await asyncio.to_thread(_delete)
        if result is None:
            raise VideoNotFoundException(video_id)
        
        # Delete from R2 if configured
        if is_r2_configured():
            try:
                # Delete all files with this video's prefix
                await r2_storage.delete_prefix(f"videos/{user_id}/{video_id}/")
                logger.info("Deleted video %s files from R2", video_id)
            except Exception as r2_err:
                logger.warning("Failed to delete video %s from R2: %s", video_id, r2_err)
        
        return result

    @staticmethod
    async def get_shared_video(share_token: str) -> Optional[Dict[str, Any]]:
        """Return video by share token (no auth required)."""
        if not share_token:
            return None

        def _fetch():
            conn = get_db()
            try:
                cur = conn.cursor()
                cur.execute(
                    "SELECT * FROM video_projects WHERE share_token=%s AND status='done'",
                    (share_token,)
                )
                row = cur.fetchone()
                if not row:
                    cur.close()
                    return None
                result = q._row_to_dict(row, cur.description, None)
                cur.close()
                return result
            finally:
                conn.close()

        return await asyncio.to_thread(_fetch)

    @staticmethod
    async def generate_share_token(video_id: str, user_id: str) -> str:
        """Create or return a share token for a completed video."""
        def _fetch_or_create():
            conn = get_db()
            try:
                project = q.get_video_project(conn, video_id, user_id)
                if not project:
                    return None
                if project.get("share_token"):
                    return project["share_token"]
                token = secrets.token_urlsafe(16)
                q.update_video_status(conn, video_id, project["status"], share_token=token)
                return token
            finally:
                conn.close()

        token = await asyncio.to_thread(_fetch_or_create)
        if token is None:
            raise VideoNotFoundException(video_id)
        return token

