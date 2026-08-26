"""
Curriculum Router - Public endpoints for curriculum data.
"""
import asyncio
from fastapi import APIRouter, HTTPException, Query

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


@router.get("/streams")
async def list_streams():
    """Get all active streams (Science, Commerce, Arts for Class 11-12)."""
    return await asyncio.to_thread(CurriculumService.list_streams)


@router.get("/subjects")
async def get_subjects(
    board: str = Query(None),
    standard: str = Query(None),
    medium: str = Query(None),
    stream: str = Query(None),
    board_id: str = Query(None),
    standard_id: str = Query(None),
    medium_id: str = Query(None),
    stream_id: str = Query(None),
):
    """Get subjects for a specific curriculum combination.
    
    For Class 1-10: stream is not needed
    For Class 11-12: stream is required (science, commerce, arts)
    """
    # Backward compatibility: accept both current and legacy query keys.
    final_board = board or board_id
    final_standard = standard or standard_id
    final_medium = medium or medium_id
    final_stream = stream or stream_id

    if not final_board or not final_standard:
        raise HTTPException(status_code=422, detail="board and standard are required")

    return await asyncio.to_thread(
        CurriculumService.get_subjects,
        final_board,
        final_standard,
        final_medium,
        final_stream,
    )
