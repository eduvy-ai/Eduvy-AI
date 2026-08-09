"""
Chapters Router - API endpoints for chapter management.
"""
import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.core.dependencies import get_current_user
from app.modules.chapters.schema import (
    ChapterCreate,
    ChapterUpdate,
    ChapterResponse,
    ChapterWithProgress,
    ChapterBulkDelete,
)
from app.modules.chapters.service import ChapterService

router = APIRouter(prefix="/chapters", tags=["Chapters"])


# ── Public Endpoints ──────────────────────────────────────────

@router.get("", response_model=List[ChapterResponse])
async def list_chapters(
    board_id: Optional[str] = Query(None, description="Filter by board ID (FK to boards.id)"),
    standard_id: Optional[str] = Query(None, description="Filter by standard ID (FK to standards.id)"),
    subject_id: Optional[str] = Query(None, description="Filter by subject ID (FK to subjects.id)"),
    is_active: bool = Query(True, description="Filter by active status"),
):
    """
    List chapters with optional filters.
    Returns chapters ordered by chapter_number.
    """
    return await asyncio.to_thread(
        ChapterService.list_chapters,
        board_id=board_id,
        standard_id=standard_id,
        subject_id=subject_id,
        is_active=is_active,
    )


@router.get("/subjects")
async def get_subjects_with_chapters(
    board_id: str = Query(..., description="Board ID (FK to boards.id)"),
    standard_id: str = Query(..., description="Standard ID (FK to standards.id)"),
):
    """
    Get list of subjects with chapter counts for the Learn tab.
    Returns: [{"subject_id": "math", "subject_name": "Mathematics", "chapter_count": 15}, ...]
    """
    return await asyncio.to_thread(
        ChapterService.get_subjects_with_chapters,
        board_id=board_id,
        standard_id=standard_id,
    )


@router.get("/with-progress", response_model=List[ChapterWithProgress])
async def get_chapters_with_progress(
    board_id: str = Query(..., description="Board ID (FK to boards.id)"),
    standard_id: str = Query(..., description="Standard ID (FK to standards.id)"),
    subject_id: str = Query(..., description="Subject ID (FK to subjects.id)"),
    user_id: str = Depends(get_current_user),
):
    """
    Get chapters with user's progress data for the Learn tab.
    Includes progress_percent, notes_count, quiz_score, last_studied.
    """
    return await asyncio.to_thread(
        ChapterService.get_chapters_with_progress,
        user_id=user_id,
        board_id=board_id,
        standard_id=standard_id,
        subject_id=subject_id,
    )


@router.get("/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: int):
    """Get a single chapter by ID."""
    chapter = await asyncio.to_thread(ChapterService.get_chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter


# ── Admin Endpoints ───────────────────────────────────────────
# These require admin auth (add admin check in production)

@router.post("", response_model=ChapterResponse, status_code=201)
async def create_chapter(data: ChapterCreate):
    """
    Create a new chapter.
    Returns 409 if chapter already exists for same board/standard/subject/number.
    """
    return await asyncio.to_thread(ChapterService.create_chapter, data)


@router.put("/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(chapter_id: int, data: ChapterUpdate):
    """Update an existing chapter."""
    return await asyncio.to_thread(ChapterService.update_chapter, chapter_id, data)


@router.delete("/{chapter_id}")
async def delete_chapter(chapter_id: int):
    """Delete a chapter."""
    deleted = await asyncio.to_thread(ChapterService.delete_chapter, chapter_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"deleted": True}


@router.post("/bulk", status_code=201)
async def bulk_create_chapters(chapters: List[ChapterCreate]):
    """
    Bulk create chapters (for seeding).
    Skips duplicates silently.
    Returns count of created chapters.
    """
    count = await asyncio.to_thread(ChapterService.bulk_create_chapters, chapters)
    return {"created": count}


@router.post("/bulk-delete")
async def bulk_delete_chapters(data: ChapterBulkDelete):
    """
    Bulk delete chapters by IDs.
    Returns count of deleted chapters.
    """
    count = await asyncio.to_thread(ChapterService.bulk_delete_chapters, data.ids)
    return {"deleted": count}
