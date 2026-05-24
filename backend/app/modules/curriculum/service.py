"""
Curriculum Service - Business logic for curriculum data.
"""
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db.connection import get_db


class CurriculumService:
    """Curriculum business logic."""
    
    @staticmethod
    def list_boards() -> List[Dict]:
        """Get all active boards."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, sort_order FROM boards WHERE is_active = TRUE ORDER BY sort_order, name"
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def list_standards(board: Optional[str] = None) -> List[Dict]:
        """Get active standards, optionally filtered by board."""
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
                    (board,)
                )
            else:
                cur.execute(
                    "SELECT id, name, grade_num, sort_order FROM standards WHERE is_active = TRUE ORDER BY grade_num"
                )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def list_mediums(board: Optional[str] = None, standard: Optional[str] = None) -> List[Dict]:
        """Get mediums available for board+standard combo."""
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
                    (board, standard)
                )
            else:
                cur.execute(
                    "SELECT id, name, sort_order FROM mediums WHERE is_active = TRUE ORDER BY sort_order, name"
                )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def get_subjects(board: str, standard: str, medium: str) -> List[str]:
        """Get subjects for a specific curriculum combination."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT subjects FROM curriculum
                   WHERE board_id = %s AND standard_id = %s AND medium_id = %s
                     AND is_active = TRUE
                   LIMIT 1""",
                (board, standard, medium)
            )
            row = cur.fetchone()
            if not row or not row["subjects"]:
                return []
            
            import json
            subjects = row["subjects"]
            if isinstance(subjects, str):
                try:
                    subjects = json.loads(subjects)
                except json.JSONDecodeError:
                    return []
            return subjects if isinstance(subjects, list) else []
        finally:
            conn.close()
