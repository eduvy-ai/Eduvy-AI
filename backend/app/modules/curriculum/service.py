"""
Curriculum Service - Business logic for curriculum data.
"""
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db.connection import get_db


class CurriculumService:
    """Curriculum business logic."""

    @staticmethod
    def _resolve_stream_id(cur, stream: Optional[str]) -> Optional[str]:
        """Resolve stream value (id or name) to canonical id."""
        if not stream:
            return None

        raw = stream.strip()
        if not raw:
            return None

        cur.execute("SELECT id FROM streams WHERE id = %s", (raw,))
        row = cur.fetchone()
        if row:
            return row["id"]

        slug = raw.lower().replace(" ", "-")
        cur.execute("SELECT id FROM streams WHERE id = %s", (slug,))
        row = cur.fetchone()
        if row:
            return row["id"]

        cur.execute("SELECT id FROM streams WHERE LOWER(name) = LOWER(%s)", (raw,))
        row = cur.fetchone()
        return row["id"] if row else None

    @staticmethod
    def _is_stream_standard(standard: str) -> bool:
        """Return True for Class 11/12 standards that require stream selection."""
        if not standard:
            return False
        normalized = standard.strip().lower()
        return "11" in normalized or "12" in normalized
    
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
    def list_streams() -> List[Dict]:
        """Get all active streams (Science, Commerce, Arts for Class 11-12)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, sort_order FROM streams WHERE is_active = TRUE ORDER BY sort_order, name"
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def get_subjects(board: str, standard: str, medium: Optional[str] = None, stream: Optional[str] = None) -> List[str]:
        """Get subjects for a specific curriculum combination.
        
        For Class 1-10: stream is NULL, returns subjects without stream
        For Class 11-12: stream is required, returns subjects for that stream
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            resolved_stream_id = None
            try:
                resolved_stream_id = CurriculumService._resolve_stream_id(cur, stream)
            except Exception:
                # Older schemas may not have streams table yet.
                resolved_stream_id = None

            if CurriculumService._is_stream_standard(standard) and not resolved_stream_id:
                # Prevent mixed-stream subject lists for Class 11/12 when stream is missing.
                return []
            
            # First try to get from subjects table (new structure with streams).
            try:
                if resolved_stream_id:
                    # Class 11-12 with stream
                    cur.execute(
                        """SELECT name FROM subjects
                           WHERE board_id = %s AND standard_id = %s AND stream_id = %s
                             AND is_active = TRUE
                           ORDER BY sort_order""",
                        (board, standard, resolved_stream_id)
                    )
                else:
                    # Class 1-10 without stream
                    cur.execute(
                        """SELECT name FROM subjects
                           WHERE board_id = %s AND standard_id = %s AND stream_id IS NULL
                             AND is_active = TRUE
                           ORDER BY sort_order""",
                        (board, standard)
                    )

                rows = cur.fetchall()
                if rows:
                    return [r["name"] for r in rows]
            except Exception:
                # Legacy deployments/tests without subjects table should fallback to curriculum table.
                pass
            
            # Fallback to curriculum table (legacy) if no subjects found
            if medium:
                cur.execute(
                    """SELECT subjects FROM curriculum
                       WHERE board_id = %s AND standard_id = %s AND medium_id = %s
                         AND is_active = TRUE
                       LIMIT 1""",
                    (board, standard, medium)
                )
                row = cur.fetchone()
                if row and row["subjects"]:
                    import json
                    subjects = row["subjects"]
                    if isinstance(subjects, str):
                        try:
                            subjects = json.loads(subjects)
                        except json.JSONDecodeError:
                            return []
                    return subjects if isinstance(subjects, list) else []
            
            return []
        finally:
            conn.close()
