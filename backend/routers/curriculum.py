"""
curriculum.py — Public read-only endpoints for curriculum data.
Used by onboarding and settings to populate dropdowns dynamically.

GET /api/curriculum/boards              → all active boards
GET /api/curriculum/standards           → all active standards
GET /api/curriculum/mediums?board=&standard=  → mediums available for that combo
GET /api/curriculum/subjects?board=&standard=&medium=  → subjects list
"""
import json
from fastapi import APIRouter, HTTPException, Query
from database import get_db

router = APIRouter()


@router.get("/curriculum/boards")
def list_boards():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, sort_order FROM boards WHERE is_active = TRUE ORDER BY sort_order, name"
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/curriculum/standards")
def list_standards(board: str = Query(None)):
    """Return active standards. If board is provided, only standards that have
    at least one curriculum entry for that board."""
    conn = get_db()
    try:
        cur = conn.cursor()
        if board:
            cur.execute(
                """SELECT DISTINCT s.id, s.name, s.grade_num, s.sort_order
                   FROM standards s
                   JOIN curriculum c ON c.standard_id = s.id
                   WHERE s.is_active = TRUE AND c.board_id = %s AND c.is_active = TRUE
                   ORDER BY s.grade_num""",
                (board,),
            )
        else:
            cur.execute(
                "SELECT id, name, grade_num, sort_order FROM standards WHERE is_active = TRUE ORDER BY grade_num"
            )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/curriculum/mediums")
def list_mediums(board: str = Query(None), standard: str = Query(None)):
    """Return mediums available for the given board+standard combo.
    Falls back to all active mediums when no filter is given."""
    conn = get_db()
    try:
        cur = conn.cursor()
        if board and standard:
            cur.execute(
                """SELECT DISTINCT m.id, m.name, m.sort_order
                   FROM mediums m
                   JOIN curriculum c ON c.medium_id = m.id
                   WHERE m.is_active = TRUE
                     AND c.board_id = %s AND c.standard_id = %s AND c.is_active = TRUE
                   ORDER BY m.sort_order, m.name""",
                (board, standard),
            )
        else:
            cur.execute(
                "SELECT id, name, sort_order FROM mediums WHERE is_active = TRUE ORDER BY sort_order, name"
            )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/curriculum/subjects")
def get_subjects(
    board: str = Query(...),
    standard: str = Query(...),
    medium: str = Query(...),
):
    """Return subjects list for a specific board+standard+medium combination."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT subjects FROM curriculum
               WHERE board_id = %s AND standard_id = %s AND medium_id = %s
                 AND is_active = TRUE
               LIMIT 1""",
            (board, standard, medium),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"No curriculum found for {board} / {standard} / {medium}",
            )
        try:
            subjects = json.loads(row["subjects"])
        except Exception:
            subjects = []
        return {"board": board, "standard": standard, "medium": medium, "subjects": subjects}
    finally:
        conn.close()
