"""
Video Router — API endpoints for whiteboard video creation.
Restricted to admin and super admin users only.
"""
import asyncio
import json
import os
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.modules.video.schemas import (
    VideoGenerateRequest,
    VideoStatusResponse,
    VideoLibraryResponse,
)
from app.modules.video.service import VideoService
from app.modules.video.exceptions import VideoNotFoundException
from app.modules.video.query import get_video_frames

router = APIRouter(prefix="/video", tags=["Video"])

_bearer = HTTPBearer(auto_error=False)
_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_admin_or_superadmin(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    """Verify JWT token belongs to an admin or super admin user."""
    if not creds:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin or super admin access only")
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(uid)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


@router.post("/generate", status_code=202)
async def generate_video(
    data: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """
    Start video generation.
    Returns immediately with status='queued'.
    Poll /video/{id}/status to track progress.
    """
    project = await VideoService.start_generation(data, current_user)

    # Kick off background rendering
    async def _render_bg():
        from app.db.connection import get_db
        from app.services.video_assembler import assemble_video
        conn = get_db()
        try:
            frames = get_video_frames(conn, project["id"])
        finally:
            conn.close()

        await assemble_video(
            video_id=project["id"],
            user_id=current_user,
            frames=frames,
            style_variant=data.style_variant,
            orientation=data.orientation,
            narration_language=data.narration_language,
            enable_captions=data.enable_captions,
        )

    background_tasks.add_task(_render_bg)
    return project


@router.get("/library", response_model=VideoLibraryResponse)
async def get_library(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: str = Depends(get_admin_or_superadmin),
):
    """Return all videos created by the current user."""
    return await VideoService.get_library(current_user, limit=limit, offset=offset)


@router.get("/{video_id}/status", response_model=VideoStatusResponse)
async def get_status(
    video_id: str,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """Poll video generation progress."""
    return await VideoService.get_status(video_id, current_user)


@router.delete("/{video_id}")
async def delete_video(
    video_id: str,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """Delete a video project and its files."""
    deleted = await VideoService.delete_video(video_id, current_user)
    return {"deleted": deleted}


@router.post("/{video_id}/share")
async def share_video(
    video_id: str,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """Generate (or retrieve) a public share token for a video."""
    token = await VideoService.generate_share_token(video_id, current_user)
    return {"share_token": token, "share_url": f"/share/video/{token}"}


@router.get("/shared/{share_token}")
async def get_shared_video(share_token: str):
    """Public endpoint — view a shared video without authentication."""
    video = await VideoService.get_shared_video(share_token)
    if not video:
        raise VideoNotFoundException(share_token)
    return video


# ── Enhanced Pipeline Endpoints (Two-Stage) ────────────────────────────────────

@router.post("/pipeline/generate", status_code=202)
async def pipeline_generate(
    data: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """
    Generate video using the enhanced two-stage pipeline.
    Stage 1: Topic → Lesson Plan (AI)
    Stage 2: Lesson Plan → Scene Script (AI)
    Then kicks off background rendering.
    """
    from app.modules.video.pipeline.orchestrator import PipelineOrchestrator

    project = await PipelineOrchestrator.generate(data, current_user, use_two_stage=True)

    # Kick off background rendering + post-render hooks
    async def _render_bg():
        import os
        from app.db.connection import get_db
        from app.services.video_assembler import assemble_video, VIDEOS_DIR
        from app.modules.video.pipeline.orchestrator import post_render_hooks

        conn = get_db()
        try:
            frames = get_video_frames(conn, project["id"])
        finally:
            conn.close()

        await assemble_video(
            video_id=project["id"],
            user_id=current_user,
            frames=frames,
            style_variant=data.style_variant,
            orientation=data.orientation,
            narration_language=data.narration_language,
            enable_captions=data.enable_captions,
        )

        # Post-render: subtitles, designed thumbnail, quiz (best-effort)
        out_dir = os.path.join(VIDEOS_DIR, current_user, project["id"])
        scenes = [
            {"title": f.get("narration", "")[:40], "narration": f.get("narration", ""),
             "duration_sec": 10, "accent": "#2980b9"}
            for f in frames
        ]
        try:
            await post_render_hooks(
                project["id"], current_user, out_dir, scenes, data.narration_language
            )
        except Exception:
            pass  # best-effort, don't fail the video

    background_tasks.add_task(_render_bg)
    return project


@router.post("/{video_id}/quiz")
async def generate_quiz(
    video_id: str,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """Generate quiz questions for a completed video."""
    from app.modules.video.pipeline.orchestrator import PipelineOrchestrator
    return await PipelineOrchestrator.generate_quiz(video_id, current_user)


@router.post("/pipeline/lesson-plan")
async def generate_lesson_plan(
    data: VideoGenerateRequest,
    current_user: str = Depends(get_admin_or_superadmin),
):
    """
    Stage 1 only: Generate a structured lesson plan without creating a video.
    Useful for previewing the plan before committing to full generation.
    """
    from app.modules.video.pipeline.lesson_planner import LessonPlanner

    plan = await LessonPlanner.generate(
        topic=data.topic,
        grade=data.grade,
        subject=data.subject,
        language=data.narration_language,
        timing=data.timing,
    )
    return plan.to_dict()
