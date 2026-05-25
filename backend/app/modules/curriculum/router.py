"""
Curriculum Router - Public endpoints for curriculum data.
"""
import asyncio
from fastapi import APIRouter, Query

from app.modules.curriculum.service import CurriculumService

router = APIRouter(prefix="/curriculum", tags=["Curriculum"])


@router.get("/boards")
async def list_boards():
    """Get all active boards."""
    return await asyncio.to_thread(CurriculumService.list_boards)


@router.get("/standards")
async def list_standards(board: str = Query(None)):
    """Get active standards, optionally filtered by board."""
    return await asyncio.to_thread(CurriculumService.list_standards, board)


@router.get("/mediums")
async def list_mediums(board: str = Query(None), standard: str = Query(None)):
    """Get mediums available for board+standard combo."""
    return await asyncio.to_thread(CurriculumService.list_mediums, board, standard)


@router.get("/subjects")
async def get_subjects(
    board: str = Query(...),
    standard: str = Query(...),
    medium: str = Query(...)
):
    """Get subjects for a specific curriculum combination."""
    return await asyncio.to_thread(CurriculumService.get_subjects, board, standard, medium)
