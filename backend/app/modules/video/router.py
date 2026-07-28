"""
Video Router — API endpoints for whiteboard video creation.
"""
import json
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse

from app.core.dependencies import get_current_user
from app.modules.video.schemas import (
    VideoGenerateRequest,
    VideoRenderRequest,
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
    current_user: str = Depends(get_current_user),
):
    """
    Generate the AI script and save it.
    Returns with status='script_ready'. The client should let the user
    review/edit scenes, then call POST /video/{id}/render to start rendering.
    """
    project = await VideoService.start_generation(data, current_user)
    return project


@router.post("/{video_id}/render", status_code=202)
async def render_video(
    video_id: str,
    body: VideoRenderRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
):
    """
    Accept (optionally edited) scenes and kick off background rendering.
    """
    project = await VideoService.update_scenes_and_queue(
        video_id, current_user, body.scenes
    )

    # Kick off background rendering (plain def → runs in threadpool, won't block event loop)
    def _render_bg():
        import asyncio, logging
        from app.db.connection import get_db
        from app.services.video_assembler import assemble_video
        from app.modules.video.query import update_video_status
        try:
            conn = get_db()
            try:
                frames = get_video_frames(conn, project["id"])
            finally:
                conn.close()

            # Run the async pipeline in a new event loop (safe since we're in a thread)
            asyncio.run(assemble_video(
                video_id=project["id"],
                user_id=current_user,
                frames=frames,
                style_variant=project.get("style_variant", "sketch_classic"),
                orientation=project.get("orientation", "horizontal"),
                narration_language=project.get("narration_language", "en"),
                enable_captions=project.get("enable_captions", True),
            ))
        except Exception as exc:
            logging.getLogger(__name__).error("Background render failed for %s: %s", project["id"], exc)
            try:
                conn = get_db()
                try:
                    update_video_status(conn, project["id"], "error", error_msg=str(exc)[:500])
                finally:
                    conn.close()
            except Exception as db_exc:
                logging.getLogger(__name__).exception(
                    "Failed to mark video %s as error after render failure: %s", project["id"], db_exc
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
