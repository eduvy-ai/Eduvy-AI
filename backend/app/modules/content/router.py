"""
Content Studio Router - API endpoints for questions, media, and assessments.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from app.modules.admin.router import get_admin_user
from app.modules.content import service
from app.modules.content.schemas import (
    QuestionCreate, QuestionUpdate, QuestionResponse, QuestionBulkImport, QuestionBulkDelete, QuestionListParams,
    MediaCreate, MediaUpdate, MediaResponse, MediaBulkDelete, MediaListParams,
    AssessmentCreate, AssessmentUpdate, AssessmentResponse, AssessmentBulkDelete, AssessmentListParams,
    QuestionType, Difficulty, MediaType, AssessmentType, AssessmentStatus, AssessmentDifficulty,
)

router = APIRouter(tags=["Content Studio"])


# ══════════════════════════════════════════════════════════════
# QUESTIONS ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/questions", response_model=dict)
async def list_questions(
    chapter_id: Optional[int] = None,
    subject_id: Optional[str] = None,
    type: Optional[QuestionType] = None,
    difficulty: Optional[Difficulty] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin = Depends(get_admin_user)
):
    """List questions with filters and pagination."""
    params = QuestionListParams(
        chapter_id=chapter_id,
        subject_id=subject_id,
        type=type,
        difficulty=difficulty,
        search=search,
        is_active=is_active,
        limit=limit,
        offset=offset
    )
    questions, total = await service.list_questions(params)
    return {"data": questions, "total": total, "limit": limit, "offset": offset}


@router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str, admin = Depends(get_admin_user)):
    """Get a single question by ID."""
    question = await service.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.post("/questions", response_model=QuestionResponse)
async def create_question(data: QuestionCreate, admin_id: int = Depends(get_admin_user)):
    """Create a new question."""
    return await service.create_question(data, created_by=str(admin_id))


@router.post("/questions/bulk", response_model=dict)
async def import_questions(data: QuestionBulkImport, admin_id: int = Depends(get_admin_user)):
    """Bulk import questions."""
    count = await service.create_questions_bulk(data.questions, created_by=str(admin_id))
    return {"created": count, "message": f"Successfully created {count} questions"}


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: str, data: QuestionUpdate, admin = Depends(get_admin_user)):
    """Update a question."""
    question = await service.update_question(question_id, data)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str, admin = Depends(get_admin_user)):
    """Delete a question."""
    deleted = await service.delete_question(question_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"deleted": True}


@router.post("/questions/bulk-delete", response_model=dict)
async def delete_questions_bulk(data: QuestionBulkDelete, admin = Depends(get_admin_user)):
    """Bulk delete questions."""
    count = await service.delete_questions_bulk(data.ids)
    return {"deleted": count}


# ══════════════════════════════════════════════════════════════
# MEDIA ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/media", response_model=dict)
async def list_media(
    type: Optional[MediaType] = None,
    chapter_id: Optional[int] = None,
    subject_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin = Depends(get_admin_user)
):
    """List media files with filters and pagination."""
    params = MediaListParams(
        type=type,
        chapter_id=chapter_id,
        subject_id=subject_id,
        search=search,
        limit=limit,
        offset=offset
    )
    media, total = await service.list_media(params)
    return {"data": media, "total": total, "limit": limit, "offset": offset}


@router.get("/media/{media_id}", response_model=MediaResponse)
async def get_media(media_id: str, admin = Depends(get_admin_user)):
    """Get a single media file by ID."""
    media = await service.get_media(media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return media


@router.post("/media", response_model=MediaResponse)
async def create_media(data: MediaCreate, admin_id: int = Depends(get_admin_user)):
    """Create a new media entry (after upload)."""
    return await service.create_media(data, uploaded_by=str(admin_id))


@router.put("/media/{media_id}", response_model=MediaResponse)
async def update_media(media_id: str, data: MediaUpdate, admin = Depends(get_admin_user)):
    """Update media metadata."""
    media = await service.update_media(media_id, data)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return media


@router.delete("/media/{media_id}")
async def delete_media(media_id: str, admin = Depends(get_admin_user)):
    """Delete a media file."""
    deleted = await service.delete_media(media_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"deleted": True}


@router.post("/media/bulk-delete", response_model=dict)
async def delete_media_bulk(data: MediaBulkDelete, admin = Depends(get_admin_user)):
    """Bulk delete media files."""
    count = await service.delete_media_bulk(data.ids)
    return {"deleted": count}


# ══════════════════════════════════════════════════════════════
# ASSESSMENTS ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/assessments", response_model=dict)
async def list_assessments(
    board_id: Optional[str] = None,
    standard_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    chapter_id: Optional[int] = None,
    type: Optional[AssessmentType] = None,
    status: Optional[AssessmentStatus] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin = Depends(get_admin_user)
):
    """List assessments with filters and pagination."""
    params = AssessmentListParams(
        board_id=board_id,
        standard_id=standard_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
        type=type,
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )
    assessments, total = await service.list_assessments(params)
    return {"data": assessments, "total": total, "limit": limit, "offset": offset}


@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(assessment_id: int, admin = Depends(get_admin_user)):
    """Get a single assessment by ID."""
    assessment = await service.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.post("/assessments", response_model=AssessmentResponse)
async def create_assessment(data: AssessmentCreate, admin_id: int = Depends(get_admin_user)):
    """Create a new assessment."""
    return await service.create_assessment(data, created_by=str(admin_id))


@router.put("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def update_assessment(assessment_id: int, data: AssessmentUpdate, admin = Depends(get_admin_user)):
    """Update an assessment."""
    assessment = await service.update_assessment(assessment_id, data)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.delete("/assessments/{assessment_id}")
async def delete_assessment(assessment_id: int, admin = Depends(get_admin_user)):
    """Delete an assessment."""
    deleted = await service.delete_assessment(assessment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"deleted": True}


@router.post("/assessments/bulk-delete", response_model=dict)
async def delete_assessments_bulk(data: AssessmentBulkDelete, admin = Depends(get_admin_user)):
    """Bulk delete assessments."""
    count = await service.delete_assessments_bulk(data.ids)
    return {"deleted": count}


@router.post("/assessments/{assessment_id}/publish", response_model=AssessmentResponse)
async def publish_assessment(assessment_id: int, admin = Depends(get_admin_user)):
    """Publish an assessment."""
    assessment = await service.publish_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.post("/assessments/{assessment_id}/archive", response_model=AssessmentResponse)
async def archive_assessment(assessment_id: int, admin = Depends(get_admin_user)):
    """Archive an assessment."""
    assessment = await service.archive_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment
