"""
Video Router — API endpoints for whiteboard video creation.
"""
import asyncio
import json
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse

from app.core.dependencies import get_current_user
from app.modules.video.schemas import (
    VideoGenerateRequest,
    VideoStatusResponse,
    VideoLibraryResponse,
)
from app.modules.video.service import VideoService
from app.modules.video.exceptions import VideoNotFoundException
from app.modules.video.query import get_video_frames

router = APIRouter(prefix="/video", tags=["Video"])


@router.post("/generate", status_code=202)
async def generate_video(
    data: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
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
    current_user: str = Depends(get_current_user),
):
    """Return all videos created by the current user."""
    return await VideoService.get_library(current_user, limit=limit, offset=offset)


@router.get("/{video_id}/status", response_model=VideoStatusResponse)
async def get_status(
    video_id: str,
    current_user: str = Depends(get_current_user),
):
    """Poll video generation progress."""
    return await VideoService.get_status(video_id, current_user)


@router.delete("/{video_id}")
async def delete_video(
    video_id: str,
    current_user: str = Depends(get_current_user),
):
    """Delete a video project and its files."""
    deleted = await VideoService.delete_video(video_id, current_user)
    return {"deleted": deleted}


@router.post("/{video_id}/share")
async def share_video(
    video_id: str,
    current_user: str = Depends(get_current_user),
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
