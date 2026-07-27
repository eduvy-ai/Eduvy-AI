"""
Video Pipeline Orchestrator — Coordinates the full two-stage generation pipeline.
Called by the video router to generate videos using the enhanced architecture.

Pipeline: Topic → LessonPlan (Stage 1) → SceneScript (Stage 2) → Render → MP4
"""
import asyncio
import json
import logging
import uuid
from typing import Any, Dict, Optional

from app.db.connection import get_db
from app.modules.video.pipeline.lesson_planner import LessonPlanner
from app.modules.video.pipeline.script_generator import ScriptGenerator, ScriptGenerationError
from app.modules.video.pipeline.scene_graph import SceneGraph
from app.modules.video.pipeline.quiz_gen import QuizGenerator
from app.modules.video.pipeline.thumbnail_gen import ThumbnailGenerator
from app.modules.video.schemas import VideoGenerateRequest
from app.modules.video import query as q

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """
    Orchestrates the full video generation pipeline:
    
    1. Lesson Planning (AI Stage 1) — structured educational plan
    2. Script Generation (AI Stage 2) — scene-by-scene video script
    3. Scene Normalization — validate & fix the scene graph
    4. Persist to DB — save project + frames
    5. Background: TTS + Render + Assemble → MP4
    """

    @staticmethod
    async def generate(
        request: VideoGenerateRequest,
        user_id: str,
        use_two_stage: bool = True,
    ) -> Dict[str, Any]:
        """
        Main entry point for video generation.
        
        Args:
            request: Video generation parameters
            user_id: Admin user ID
            use_two_stage: If True, uses the new two-stage pipeline.
                          If False, falls back to legacy single-shot generation.
                          
        Returns:
            Project dict with id, status='queued', etc.
        """
        from app.modules.video.service import VideoService, _normalize_scenes, PLAN_VIDEO_LIMITS

        # Enforce plan limits (reuse existing logic)
        plan = await asyncio.to_thread(_get_user_plan, user_id)
        existing = await asyncio.to_thread(_count_videos, user_id)
        limit = PLAN_VIDEO_LIMITS.get(plan, 999)  # Admins get high limit
        if existing >= limit:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail=f"Video limit reached ({limit}). Delete old videos to create more."
            )

        if use_two_stage:
            scene_graph = await _two_stage_pipeline(request)
        else:
            # Fallback to legacy single-shot
            script_data = await VideoService._call_ai_for_script(request, plan)
            scenes = _normalize_scenes(
                script_data.get("scenes", []),
                request.topic,
                script_data.get("subject"),
            )
            scene_graph = SceneGraph.from_ai_output({
                "title": script_data.get("title", request.topic),
                "scenes": scenes,
            })

        title = scene_graph.title or request.topic[:60]
        scenes_list = scene_graph.to_scene_list()

        # Persist to DB
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
            "script_json": json.dumps(scenes_list),
            "bg_music": request.bg_music,
            "voice_instructions": request.voice_instructions,
            "enable_captions": request.enable_captions,
        }

        project = await asyncio.to_thread(_save_project, project_data, scenes_list)
        logger.info("Pipeline: video %s created with %d scenes", video_id, len(scenes_list))
        return project

    @staticmethod
    async def generate_quiz(
        video_id: str,
        user_id: str,
        language: str = "English",
    ) -> Dict[str, Any]:
        """Generate quiz questions for an existing video."""
        # Fetch video project to get topic/subject
        def _fetch():
            conn = get_db()
            try:
                return q.get_video_project(conn, video_id, user_id)
            finally:
                conn.close()

        project = await asyncio.to_thread(_fetch)
        if not project:
            from app.modules.video.exceptions import VideoNotFoundException
            raise VideoNotFoundException(video_id)

        # Create a minimal lesson plan from the project metadata
        from app.modules.video.pipeline.scene_graph import LessonPlan
        plan = LessonPlan(
            topic=project.get("topic", ""),
            subject=project.get("subject", "General"),
            grade="",
            key_concepts=[{"concept": project.get("topic", ""), "explanation": ""}],
        )

        quiz = await QuizGenerator.generate(plan, language=language)
        return quiz


async def _two_stage_pipeline(request: VideoGenerateRequest) -> SceneGraph:
    """
    Execute the full two-stage AI pipeline:
    Stage 1: Topic → Lesson Plan
    Stage 2: Lesson Plan → Scene Script
    """
    # Stage 1: Generate lesson plan
    logger.info("Pipeline Stage 1: Generating lesson plan for '%s'", request.topic)
    lesson_plan = await LessonPlanner.generate(
        topic=request.topic,
        grade=request.grade,
        subject=request.subject,
        language=request.narration_language,
        timing=request.timing,
    )
    logger.info("Pipeline Stage 1 complete: %d concepts, %d visual strategies",
               len(lesson_plan.key_concepts), len(lesson_plan.visual_strategy))

    # Stage 2: Convert lesson plan to scene script
    logger.info("Pipeline Stage 2: Generating scene script")
    try:
        scene_graph = await ScriptGenerator.generate(
            lesson_plan=lesson_plan,
            language=request.narration_language,
            timing=request.timing,
            pacing=request.pacing,
        )
    except ScriptGenerationError as e:
        logger.error("Pipeline Stage 2 failed: %s", e)
        raise

    # Validate
    warnings = scene_graph.validate()
    if warnings:
        logger.warning("Pipeline validation warnings: %s", "; ".join(warnings[:5]))

    logger.info("Pipeline Stage 2 complete: %d scenes, ~%ds duration",
               scene_graph.scene_count, scene_graph.total_duration_sec)

    return scene_graph


def _get_user_plan(user_id: str) -> str:
    """Get user's plan (admin users typically have premium)."""
    conn = get_db()
    try:
        cur = conn.cursor()
        # Check admin_users first
        cur.execute("SELECT role FROM admin_users WHERE id=%s", (int(user_id),))
        row = cur.fetchone()
        if row:
            return "premium"  # Admins always get premium limits
        # Fallback to regular users table
        cur.execute("SELECT plan FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        return (row[0] if row else "free") if row else "free"
    except Exception:
        return "premium"  # Default admin to premium on error
    finally:
        conn.close()


def _count_videos(user_id: str) -> int:
    conn = get_db()
    try:
        return q.count_user_videos(conn, user_id)
    finally:
        conn.close()


def _save_project(project_data: Dict[str, Any], scenes: list) -> Dict[str, Any]:
    """Save project and frames to DB."""
    conn = get_db()
    try:
        q.insert_video_project(conn, project_data)
        for idx, scene in enumerate(scenes):
            frame_data = {
                "video_id": project_data["id"],
                "frame_index": idx,
                "narration": scene.get("narration", ""),
                "svg_spec": json.dumps({
                    "type": scene.get("svg_type", "draw"),
                    "title": scene.get("title", ""),
                    "data": scene.get("svg_data", {}),
                    "onscreen_text": scene.get("onscreen_text", []),
                    "duration_sec": scene.get("duration_sec", 10),
                    "accent": scene.get("accent", ""),
                }),
            }
            q.insert_video_frame(conn, frame_data)
        q.update_video_status(conn, project_data["id"], "queued", frame_count=len(scenes))
        return q.get_video_project(conn, project_data["id"], project_data["user_id"])
    finally:
        conn.close()


async def post_render_hooks(video_id: str, user_id: str, out_dir: str,
                            scenes: list, language: str = "English") -> None:
    """
    Post-render hooks: generate subtitles and designed thumbnail.
    Called after video assembly is complete. Best-effort — failures
    don't break the video.
    """
    import os

    # ── Generate SRT subtitles ────────────────────────────────────────
    try:
        from app.modules.video.pipeline.subtitle_gen import SubtitleGenerator

        audio_durations = [s.get("duration_sec", 10) for s in scenes]
        srt_path = os.path.join(out_dir, "subtitles.srt")
        SubtitleGenerator.generate_srt(scenes, audio_durations, srt_path)
        logger.info("Post-render: subtitles generated for %s", video_id[:8])
    except Exception as exc:
        logger.warning("Post-render: subtitle generation failed: %s", exc)

    # ── Generate designed thumbnail ───────────────────────────────────
    try:
        from app.modules.video.pipeline.thumbnail_gen import ThumbnailGenerator

        title = scenes[0].get("title", "") if scenes else ""
        topic = scenes[0].get("narration", "")[:50] if scenes else ""
        accent = scenes[0].get("accent", "#2980b9") if scenes else "#2980b9"
        thumb_path = os.path.join(out_dir, "thumb_designed.png")
        ThumbnailGenerator.generate(
            title=title or topic,
            subject="",
            output_path=thumb_path,
            accent_color=accent,
        )
        logger.info("Post-render: designed thumbnail generated for %s", video_id[:8])
    except Exception as exc:
        logger.warning("Post-render: thumbnail generation failed: %s", exc)

    # ── Auto-generate quiz (best-effort) ──────────────────────────────
    try:
        from app.modules.video.pipeline.scene_graph import LessonPlan
        from app.modules.video.pipeline.quiz_gen import QuizGenerator

        # Build minimal plan from scenes
        concepts = [{"concept": s.get("title", ""), "explanation": s.get("narration", "")[:100]}
                    for s in scenes if s.get("title")]
        plan = LessonPlan(
            topic=scenes[0].get("title", "") if scenes else "",
            subject="", grade="",
            key_concepts=concepts[:5],
        )
        quiz = await QuizGenerator.generate(plan, language=language, num_questions=3)

        # Store quiz in DB
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE video_projects SET quiz_json=%s WHERE id=%s",
                (json.dumps(quiz, ensure_ascii=False), video_id)
            )
            conn.commit()
            cur.close()
        except Exception:
            pass  # quiz_json column may not exist yet
        finally:
            conn.close()

        logger.info("Post-render: quiz generated for %s (%d questions)",
                   video_id[:8], len(quiz.get("questions", [])))
    except Exception as exc:
        logger.warning("Post-render: quiz generation failed: %s", exc)
