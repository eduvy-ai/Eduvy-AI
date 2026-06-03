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
from services.ai_service import call_ai, resolve_provider_model

logger = logging.getLogger(__name__)

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
        2. Call AI to generate the script
        3. Persist project + frames to DB
        4. Return project dict (status='queued') — rendering runs in background
        """
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
            "script_json": json.dumps(script_scenes.get("scenes", [])),
            "bg_music": request.bg_music,
            "voice_instructions": request.voice_instructions,
            "enable_captions": request.enable_captions,
        }
        scenes = script_scenes.get("scenes", [])
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

        # Use the most capable model available — script quality is the #1 visual quality driver
        provider, model = resolve_provider_model(plan, "groq", "llama-3.3-70b-versatile")

        # Scale token budget with duration: more scenes = larger JSON output.
        # 4096 is too small for ≥1 min videos and causes truncated JSON on live.
        try:
            timing_float = float(request.timing)
        except (TypeError, ValueError):
            timing_float = 1.0
        if timing_float <= 0.5:
            max_tokens = 4096
        elif timing_float <= 1.0:
            max_tokens = 6144
        elif timing_float <= 2.0:
            max_tokens = 10240
        else:
            max_tokens = 16384  # 4 min → up to 24 scenes

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
            logger.error("AI script generation failed: %s", exc)
            raise VideoGenerationError(f"Script generation failed: {str(exc)}")

        # Detect the "no API keys configured" sentinel before trying to parse JSON
        if response_text.startswith("⚠️"):
            logger.error(
                "AI unavailable for video script — no API keys found. "
                "Set GROQ_API_KEY (or GEMINI_API_KEY/OPENAI_API_KEY) as environment variables on Render. "
                "Raw: %s", response_text
            )
            raise VideoGenerationError(
                "AI service is unavailable. Please add an AI provider API key "
                "(GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY) in the server environment variables."
            )

        logger.info("AI raw response (first 800 chars): %s", response_text[:800])

        # Strip markdown fences (```json ... ``` or ``` ... ```)
        cleaned = response_text.strip()
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()

        # Attempt 1: parse the whole string
        result = None
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Attempt 2: extract the first {...} block
        if result is None:
            m = re.search(r'\{[\s\S]*\}', cleaned)
            if m:
                try:
                    result = json.loads(m.group(0))
                except json.JSONDecodeError:
                    pass

        if result is None:
            logger.error("AI returned unparseable response: %s", response_text[:1000])
            raise VideoGenerationError("AI returned malformed JSON script")

        if not isinstance(result, dict):
            logger.error("AI result is not a dict: %s", type(result))
            raise VideoGenerationError("AI returned non-object JSON")

        # Some models wrap the output under a key like {"script": {...}}
        if "scenes" not in result:
            for v in result.values():
                if isinstance(v, dict) and "scenes" in v:
                    result = v
                    break

        if "scenes" not in result:
            logger.error("AI result missing 'scenes'. Keys: %s | Sample: %s", list(result.keys()), str(result)[:400])
            raise VideoGenerationError("AI script missing required 'scenes' field")

        return result

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
        def _delete():
            conn = get_db()
            try:
                project = q.get_video_project(conn, video_id, user_id)
                if not project:
                    return None
                for path_key in ("file_path", "thumb_path"):
                    path = project.get(path_key, "")
                    if path and os.path.exists(path):
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

