"""
Curriculum Router - Public endpoints for curriculum data.
"""
from fastapi import APIRouter, Query

from app.modules.curriculum.service import CurriculumService

router = APIRouter(prefix="/curriculum", tags=["Curriculum"])


@router.get("/boards")
def list_boards():
    """Get all active boards."""
    return CurriculumService.list_boards()


@router.get("/standards")
def list_standards(board: str = Query(None)):
    """Get active standards, optionally filtered by board."""
    return CurriculumService.list_standards(board)


@router.get("/mediums")
def list_mediums(board: str = Query(None), standard: str = Query(None)):
    """Get mediums available for board+standard combo."""
    return CurriculumService.list_mediums(board, standard)


@router.get("/subjects")
def get_subjects(
    board: str = Query(...),
    standard: str = Query(...),
    medium: str = Query(...)
):
    """Get subjects for a specific curriculum combination."""
    return CurriculumService.get_subjects(board, standard, medium)
