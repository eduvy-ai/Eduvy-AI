"""
Curriculum Service - Business logic for curriculum data.
"""
import json
import re
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db.connection import get_db


class CurriculumService:
    """Curriculum business logic."""

    _SCHOOL_SCOPE_RE = re.compile(r"^s\d+_(.+)$")

    @staticmethod
    def _to_global_id(scoped_or_global_id: Optional[str]) -> Optional[str]:
        """Convert school-scoped ID (s{school_id}_*) to global ID; return as-is when already global."""
        if not scoped_or_global_id:
            return scoped_or_global_id
        raw = scoped_or_global_id.strip()
        if not raw:
            return raw
        match = CurriculumService._SCHOOL_SCOPE_RE.match(raw)
        return match.group(1) if match else raw

    @staticmethod
    def _get_user_school_id(cur, user_id: Optional[str]) -> Optional[int]:
        """Return school_id for a user, or None when not scoped to school."""
        if not user_id:
            return None
        cur.execute("SELECT school_id FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return row.get("school_id") if row else None

    @staticmethod
    def _resolve_board_ids(cur, board: str, school_id: Optional[int]) -> tuple[Optional[str], Optional[str]]:
        """Resolve board input to (scoped_id, global_id)."""
        if not board:
            return (None, None)

        raw = board.strip()
        if not raw:
            return (None, None)

        # Exact id match first.
        cur.execute("SELECT id, school_id FROM boards WHERE id = %s", (raw,))
        row = cur.fetchone()
        if row:
            found_id = row["id"]
            if found_id.startswith("s"):
                return (found_id, CurriculumService._to_global_id(found_id))
            scoped = f"s{school_id}_{found_id}" if school_id else None
            return (scoped, found_id)

        slug = raw.lower().replace(" ", "-")
        cur.execute("SELECT id, school_id FROM boards WHERE id = %s", (slug,))
        row = cur.fetchone()
        if row:
            found_id = row["id"]
            if found_id.startswith("s"):
                return (found_id, CurriculumService._to_global_id(found_id))
            scoped = f"s{school_id}_{found_id}" if school_id else None
            return (scoped, found_id)

        cur.execute("SELECT id FROM boards WHERE LOWER(name) = LOWER(%s) AND school_id IS NULL", (raw,))
        global_row = cur.fetchone()
        global_id = global_row["id"] if global_row else slug
        scoped_id = f"s{school_id}_{global_id}" if school_id else None
        return (scoped_id, global_id)

    @staticmethod
    def _resolve_standard_ids(cur, standard: str, school_id: Optional[int]) -> tuple[Optional[str], Optional[str]]:
        """Resolve standard input to (scoped_id, global_id)."""
        if not standard:
            return (None, None)

        raw = standard.strip()
        if not raw:
            return (None, None)

        cur.execute("SELECT id, school_id FROM standards WHERE id = %s", (raw,))
        row = cur.fetchone()
        if row:
            found_id = row["id"]
            if found_id.startswith("s"):
                return (found_id, CurriculumService._to_global_id(found_id))
            scoped = f"s{school_id}_{found_id}" if school_id else None
            return (scoped, found_id)

        slug = raw.lower().replace(" ", "-")
        cur.execute("SELECT id, school_id FROM standards WHERE id = %s", (slug,))
        row = cur.fetchone()
        if row:
            found_id = row["id"]
            if found_id.startswith("s"):
                return (found_id, CurriculumService._to_global_id(found_id))
            scoped = f"s{school_id}_{found_id}" if school_id else None
            return (scoped, found_id)

        cur.execute("SELECT id FROM standards WHERE LOWER(name) = LOWER(%s) AND school_id IS NULL", (raw,))
        global_row = cur.fetchone()
        global_id = global_row["id"] if global_row else slug
        scoped_id = f"s{school_id}_{global_id}" if school_id else None
        return (scoped_id, global_id)

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
    def list_boards(user_id: Optional[str] = None) -> List[Dict]:
        """Get all active boards."""
        conn = get_db()
        try:
            cur = conn.cursor()
            school_id = CurriculumService._get_user_school_id(cur, user_id)

            if not school_id:
                cur.execute(
                    "SELECT id, name, sort_order FROM boards WHERE is_active = TRUE AND school_id IS NULL ORDER BY sort_order, name"
                )
                return [dict(r) for r in cur.fetchall()]

            cur.execute(
                """
                SELECT id, name, sort_order, school_id
                FROM boards
                WHERE is_active = TRUE
                  AND (school_id IS NULL OR school_id = %s)
                ORDER BY sort_order, name
                """,
                (school_id,),
            )
            rows = [dict(r) for r in cur.fetchall()]

            # Prefer global values for shared IDs so superadmin updates reflect immediately.
            merged: Dict[str, Dict] = {}
            for row in rows:
                global_id = CurriculumService._to_global_id(row["id"])
                existing = merged.get(global_id)
                if not existing or row.get("school_id") is None:
                    merged[global_id] = {
                        "id": global_id,
                        "name": row["name"],
                        "sort_order": row.get("sort_order", 0),
                    }

            result = list(merged.values())
            result.sort(key=lambda x: (x.get("sort_order", 0), x.get("name", "")))
            return result
        finally:
            conn.close()
    
    @staticmethod
    def list_standards(board: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict]:
        """Get active standards, optionally filtered by board."""
        conn = get_db()
        try:
            cur = conn.cursor()
            school_id = CurriculumService._get_user_school_id(cur, user_id)

            if board:
                scoped_board_id, global_board_id = CurriculumService._resolve_board_ids(cur, board, school_id)
                board_candidates = [global_board_id]
                if school_id and scoped_board_id:
                    board_candidates.append(scoped_board_id)
                board_candidates = [b for b in board_candidates if b]

                cur.execute(
                    """
                    SELECT DISTINCT s.id, s.name, s.grade_num, s.sort_order, s.school_id
                    FROM standards s
                    JOIN curriculum c ON c.standard_id = s.id
                    WHERE s.is_active = TRUE
                      AND c.is_active = TRUE
                      AND c.board_id = ANY(%s)
                      AND (s.school_id IS NULL OR s.school_id = %s)
                    ORDER BY s.grade_num, s.sort_order, s.name
                    """,
                    (board_candidates, school_id),
                )
            else:
                if school_id:
                    cur.execute(
                        """
                        SELECT id, name, grade_num, sort_order, school_id
                        FROM standards
                        WHERE is_active = TRUE
                          AND (school_id IS NULL OR school_id = %s)
                        ORDER BY grade_num, sort_order, name
                        """,
                        (school_id,),
                    )
                else:
                    cur.execute(
                        "SELECT id, name, grade_num, sort_order, school_id FROM standards WHERE is_active = TRUE AND school_id IS NULL ORDER BY grade_num"
                    )

            rows = [dict(r) for r in cur.fetchall()]
            merged: Dict[str, Dict] = {}
            for row in rows:
                global_id = CurriculumService._to_global_id(row["id"])
                existing = merged.get(global_id)
                if not existing or row.get("school_id") is None:
                    merged[global_id] = {
                        "id": global_id,
                        "name": row["name"],
                        "grade_num": row.get("grade_num", 0),
                        "sort_order": row.get("sort_order", 0),
                    }

            result = list(merged.values())
            result.sort(key=lambda x: (x.get("grade_num", 0), x.get("sort_order", 0), x.get("name", "")))
            return result
        finally:
            conn.close()
    
    @staticmethod
    def list_mediums(board: Optional[str] = None, standard: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict]:
        """Get mediums available for board+standard combo."""
        conn = get_db()
        try:
            cur = conn.cursor()
            school_id = CurriculumService._get_user_school_id(cur, user_id)
            if board and standard:
                scoped_board_id, global_board_id = CurriculumService._resolve_board_ids(cur, board, school_id)
                scoped_standard_id, global_standard_id = CurriculumService._resolve_standard_ids(cur, standard, school_id)

                board_candidates = [global_board_id]
                if school_id and scoped_board_id:
                    board_candidates.append(scoped_board_id)
                board_candidates = [b for b in board_candidates if b]

                standard_candidates = [global_standard_id]
                if school_id and scoped_standard_id:
                    standard_candidates.append(scoped_standard_id)
                standard_candidates = [s for s in standard_candidates if s]

                cur.execute(
                    """SELECT DISTINCT m.id, m.name, m.sort_order, m.school_id
                       FROM mediums m
                       JOIN curriculum c ON c.medium_id = m.id
                       WHERE m.is_active = TRUE
                         AND c.board_id = ANY(%s)
                         AND c.standard_id = ANY(%s)
                         AND c.is_active = TRUE
                         AND (m.school_id IS NULL OR m.school_id = %s)
                       ORDER BY m.sort_order, m.name""",
                    (board_candidates, standard_candidates, school_id)
                )
            else:
                if school_id:
                    cur.execute(
                        """
                        SELECT id, name, sort_order, school_id
                        FROM mediums
                        WHERE is_active = TRUE
                          AND (school_id IS NULL OR school_id = %s)
                        ORDER BY sort_order, name
                        """,
                        (school_id,),
                    )
                else:
                    cur.execute(
                        "SELECT id, name, sort_order, school_id FROM mediums WHERE is_active = TRUE AND school_id IS NULL ORDER BY sort_order, name"
                    )

            rows = [dict(r) for r in cur.fetchall()]
            merged: Dict[str, Dict] = {}
            for row in rows:
                global_id = CurriculumService._to_global_id(row["id"])
                existing = merged.get(global_id)
                if not existing or row.get("school_id") is None:
                    merged[global_id] = {
                        "id": global_id,
                        "name": row["name"],
                        "sort_order": row.get("sort_order", 0),
                    }

            result = list(merged.values())
            result.sort(key=lambda x: (x.get("sort_order", 0), x.get("name", "")))
            return result
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
    def get_subjects(
        board: str,
        standard: str,
        medium: Optional[str] = None,
        stream: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> List[str]:
        """Get subjects for a specific curriculum combination.
        
        For Class 1-10: stream is NULL, returns subjects without stream
        For Class 11-12: stream is required, returns subjects for that stream
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            school_id = CurriculumService._get_user_school_id(cur, user_id)
            scoped_board_id, global_board_id = CurriculumService._resolve_board_ids(cur, board, school_id)
            scoped_standard_id, global_standard_id = CurriculumService._resolve_standard_ids(cur, standard, school_id)

            board_candidates = [global_board_id]
            if school_id and scoped_board_id:
                board_candidates.append(scoped_board_id)
            board_candidates = [b for b in board_candidates if b]

            standard_candidates = [global_standard_id]
            if school_id and scoped_standard_id:
                standard_candidates.append(scoped_standard_id)
            standard_candidates = [s for s in standard_candidates if s]

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
                        """SELECT id, name, sort_order, school_id FROM subjects
                           WHERE board_id = ANY(%s)
                             AND standard_id = ANY(%s)
                             AND stream_id = %s
                             AND is_active = TRUE
                             AND (school_id IS NULL OR school_id = %s)
                           ORDER BY sort_order, name""",
                        (board_candidates, standard_candidates, resolved_stream_id, school_id)
                    )
                else:
                    # Class 1-10 without stream
                    cur.execute(
                        """SELECT id, name, sort_order, school_id FROM subjects
                           WHERE board_id = ANY(%s)
                             AND standard_id = ANY(%s)
                             AND stream_id IS NULL
                             AND is_active = TRUE
                             AND (school_id IS NULL OR school_id = %s)
                           ORDER BY sort_order, name""",
                        (board_candidates, standard_candidates, school_id)
                    )

                rows = cur.fetchall()
                if rows:
                    # Prefer global names for shared IDs so superadmin updates reflect immediately.
                    merged: Dict[str, Dict] = {}
                    for row in rows:
                        global_id = CurriculumService._to_global_id(row.get("id"))
                        existing = merged.get(global_id)
                        if not existing or row.get("school_id") is None:
                            merged[global_id] = {
                                "name": row.get("name", ""),
                                "sort_order": row.get("sort_order", 0),
                            }

                    ordered = sorted(merged.values(), key=lambda x: (x.get("sort_order", 0), x.get("name", "")))
                    return [x.get("name", "") for x in ordered if x.get("name")]
            except Exception:
                # Legacy deployments/tests without subjects table should fallback to curriculum table.
                pass
            
            # Fallback to curriculum table (legacy) if no subjects found
            if medium:
                medium_global = CurriculumService._to_global_id(medium)
                medium_scoped = f"s{school_id}_{medium_global}" if school_id and medium_global else None
                medium_candidates = [medium_global]
                if medium_scoped:
                    medium_candidates.append(medium_scoped)
                medium_candidates = [m for m in medium_candidates if m]

                cur.execute(
                    """SELECT subjects, school_id FROM curriculum
                       WHERE board_id = ANY(%s)
                         AND standard_id = ANY(%s)
                         AND medium_id = ANY(%s)
                         AND is_active = TRUE
                       ORDER BY CASE WHEN school_id IS NULL THEN 0 ELSE 1 END
                    """,
                    (board_candidates, standard_candidates, medium_candidates)
                )
                rows = cur.fetchall()
                if rows:
                    merged_subjects: List[str] = []
                    seen = set()
                    for row in rows:
                        subjects = row.get("subjects")
                        if isinstance(subjects, str):
                            try:
                                subjects = json.loads(subjects)
                            except json.JSONDecodeError:
                                subjects = []
                        if not isinstance(subjects, list):
                            continue
                        for sub in subjects:
                            key = str(sub).strip().lower()
                            if key and key not in seen:
                                seen.add(key)
                                merged_subjects.append(str(sub).strip())
                    return merged_subjects
            
            return []
        finally:
            conn.close()
