"""
Chapters Service - Business logic for chapter management.
"""
import json
import logging
from typing import Dict, List, Optional

from fastapi import HTTPException

from app.db.connection import get_db
from app.modules.chapters.schema import ChapterCreate, ChapterUpdate

logger = logging.getLogger(__name__)


class ChapterService:
    """Chapter business logic."""
    
    @staticmethod
    def _resolve_board_id(cur, board_id: str, school_id: int = None) -> str:
        """Resolve board name to ID, trying school-scoped first if school_id set."""
        if school_id:
            scoped = f"s{school_id}_{board_id.lower().replace(' ', '-')}"
            cur.execute("SELECT id FROM boards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        cur.execute("SELECT id FROM boards WHERE id = %s", (board_id,))
        if cur.fetchone():
            return board_id
        cur.execute("SELECT id FROM boards WHERE LOWER(name) = LOWER(%s)", (board_id,))
        row = cur.fetchone()
        found_id = row["id"] if row else board_id
        # Try school-scoped version of the resolved ID
        if school_id:
            scoped = f"s{school_id}_{found_id}"
            cur.execute("SELECT id FROM boards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        return found_id
    
    @staticmethod
    def _resolve_standard_id(cur, standard_id: str, school_id: int = None) -> str:
        """Resolve standard name to ID, trying school-scoped first if school_id set."""
        if school_id:
            scoped = f"s{school_id}_{standard_id.lower().replace(' ', '-')}"
            cur.execute("SELECT id FROM standards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        cur.execute("SELECT id FROM standards WHERE id = %s", (standard_id,))
        if cur.fetchone():
            return standard_id
        cur.execute("SELECT id FROM standards WHERE LOWER(name) = LOWER(%s)", (standard_id,))
        row = cur.fetchone()
        found_id = row["id"] if row else standard_id
        # Try school-scoped version of the resolved ID
        if school_id:
            scoped = f"s{school_id}_{found_id}"
            cur.execute("SELECT id FROM standards WHERE id = %s", (scoped,))
            if cur.fetchone():
                return scoped
        return found_id
    
    @staticmethod
    def list_chapters(
        board_id: Optional[str] = None,
        standard_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        stream_id: Optional[str] = None,
        is_active: bool = True,
        school_id: Optional[int] = None
    ) -> List[Dict]:
        """
        List chapters with optional filters.
        Returns chapters ordered by chapter_number.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Resolve names to IDs (with school scoping if applicable)
            if board_id:
                board_id = ChapterService._resolve_board_id(cur, board_id, school_id)
            if standard_id:
                standard_id = ChapterService._resolve_standard_id(cur, standard_id, school_id)
            
            query = """
                SELECT c.id, c.board_id, c.standard_id, c.subject_id, c.stream_id, c.chapter_number, c.chapter_name,
                       c.chapter_name_local, c.description, c.topics, c.is_active, c.created_at,
                       b.name as board_name, st.name as standard_name, s.name as subject_name,
                       str.name as stream_name
                FROM chapters c
                LEFT JOIN boards b ON c.board_id = b.id
                LEFT JOIN standards st ON c.standard_id = st.id
                LEFT JOIN subjects s ON c.subject_id = s.id
                LEFT JOIN streams str ON c.stream_id = str.id
                WHERE 1=1
            """
            params = []
            
            if board_id:
                query += " AND c.board_id = %s"
                params.append(board_id)
            if standard_id:
                query += " AND c.standard_id = %s"
                params.append(standard_id)
            if subject_id:
                query += " AND c.subject_id = %s"
                params.append(subject_id)
            if stream_id:
                query += " AND c.stream_id = %s"
                params.append(stream_id)
            if is_active is not None:
                query += " AND c.is_active = %s"
                params.append(is_active)
            
            query += " ORDER BY c.chapter_number ASC"
            
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            
            result = []
            for row in rows:
                chapter = dict(row)
                # Parse topics JSON
                if chapter.get("topics"):
                    try:
                        if isinstance(chapter["topics"], str):
                            chapter["topics"] = json.loads(chapter["topics"])
                    except json.JSONDecodeError:
                        chapter["topics"] = []
                else:
                    chapter["topics"] = []
                result.append(chapter)
            
            return result
        finally:
            conn.close()
    
    @staticmethod
    def get_chapter(chapter_id: int) -> Optional[Dict]:
        """Get a single chapter by ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT c.id, c.board_id, c.standard_id, c.subject_id, c.chapter_number, c.chapter_name,
                          c.chapter_name_local, c.description, c.topics, c.is_active, c.created_at,
                          b.name as board_name, st.name as standard_name, s.name as subject_name
                   FROM chapters c
                   LEFT JOIN boards b ON c.board_id = b.id
                   LEFT JOIN standards st ON c.standard_id = st.id
                   LEFT JOIN subjects s ON c.subject_id = s.id
                   WHERE c.id = %s""",
                (chapter_id,)
            )
            row = cur.fetchone()
            if not row:
                return None
            
            chapter = dict(row)
            if chapter.get("topics"):
                try:
                    if isinstance(chapter["topics"], str):
                        chapter["topics"] = json.loads(chapter["topics"])
                except json.JSONDecodeError:
                    chapter["topics"] = []
            else:
                chapter["topics"] = []
            
            return chapter
        finally:
            conn.close()
    
    @staticmethod
    def create_chapter(data: ChapterCreate, school_id: int = None) -> Dict:
        """Create a new chapter. School admins can only create for their school."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check for duplicate (same board_id+standard_id+subject_id+chapter_number)
            cur.execute(
                """SELECT id FROM chapters
                   WHERE board_id = %s AND standard_id = %s AND subject_id = %s AND chapter_number = %s""",
                (data.board_id, data.standard_id, data.subject_id, data.chapter_number)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail=f"Chapter {data.chapter_number} already exists for {data.board_id}/{data.standard_id}/{data.subject_id}"
                )
            
            topics_json = json.dumps(data.topics or [])
            
            cur.execute(
                """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name,
                                         chapter_name_local, description, topics, is_active, school_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id, created_at""",
                (data.board_id, data.standard_id, data.subject_id, data.chapter_number, data.chapter_name,
                 data.chapter_name_local, data.description, topics_json, data.is_active, school_id)
            )
            row = cur.fetchone()
            conn.commit()
            
            return {
                "id": row["id"],
                "board_id": data.board_id,
                "standard_id": data.standard_id,
                "subject_id": data.subject_id,
                "chapter_number": data.chapter_number,
                "chapter_name": data.chapter_name,
                "chapter_name_local": data.chapter_name_local,
                "description": data.description,
                "topics": data.topics or [],
                "is_active": data.is_active,
                "created_at": str(row["created_at"]),
            }
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to create chapter: {e}")
            raise HTTPException(status_code=500, detail="Failed to create chapter")
        finally:
            conn.close()
    
    @staticmethod
    def update_chapter(chapter_id: int, data: ChapterUpdate, school_id: int = None) -> Dict:
        """Update an existing chapter. School admins can only update their own chapters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check chapter exists and belongs to the admin's school
            if school_id is not None:
                cur.execute("SELECT id FROM chapters WHERE id = %s AND school_id = %s", (chapter_id, school_id))
            else:
                cur.execute("SELECT id FROM chapters WHERE id = %s", (chapter_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Chapter not found")
            
            # Build dynamic update query
            updates = []
            params = []
            
            if data.chapter_name is not None:
                updates.append("chapter_name = %s")
                params.append(data.chapter_name)
            if data.chapter_name_local is not None:
                updates.append("chapter_name_local = %s")
                params.append(data.chapter_name_local)
            if data.description is not None:
                updates.append("description = %s")
                params.append(data.description)
            if data.topics is not None:
                updates.append("topics = %s")
                params.append(json.dumps(data.topics))
            if data.is_active is not None:
                updates.append("is_active = %s")
                params.append(data.is_active)
            
            if not updates:
                # Nothing to update, return existing
                return ChapterService.get_chapter(chapter_id)
            
            params.append(chapter_id)
            query = f"UPDATE chapters SET {', '.join(updates)} WHERE id = %s"
            cur.execute(query, tuple(params))
            conn.commit()
            
            return ChapterService.get_chapter(chapter_id)
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to update chapter: {e}")
            raise HTTPException(status_code=500, detail="Failed to update chapter")
        finally:
            conn.close()
    
    @staticmethod
    def delete_chapter(chapter_id: int, school_id: int = None) -> bool:
        """Delete a chapter. School admins can only delete their own chapters."""
        conn = get_db()
        try:
            cur = conn.cursor()
            if school_id is not None:
                cur.execute("DELETE FROM chapters WHERE id = %s AND school_id = %s RETURNING id", (chapter_id, school_id))
            else:
                cur.execute("DELETE FROM chapters WHERE id = %s RETURNING id", (chapter_id,))
            row = cur.fetchone()
            conn.commit()
            return row is not None
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to delete chapter: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete chapter")
        finally:
            conn.close()
    
    @staticmethod
    def get_subjects_with_chapters(board_id: str, standard_id: str, user_id: str = None) -> List[Dict]:
        """
        Get list of subjects with chapter counts for a board+standard.
        Accepts either IDs (e.g. "cbse") or names (e.g. "CBSE").
        For school students, resolves to school-scoped curriculum.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Look up user's school_id
            school_id = None
            if user_id:
                cur.execute("SELECT school_id FROM users WHERE id = %s", (user_id,))
                row = cur.fetchone()
                if row:
                    school_id = row.get("school_id")
            
            board_id = ChapterService._resolve_board_id(cur, board_id, school_id)
            standard_id = ChapterService._resolve_standard_id(cur, standard_id, school_id)
            
            cur.execute(
                """SELECT c.subject_id, s.name as subject_name, COUNT(*) as chapter_count
                   FROM chapters c
                   LEFT JOIN subjects s ON c.subject_id = s.id
                   WHERE c.board_id = %s AND c.standard_id = %s AND c.is_active = TRUE
                   GROUP BY c.subject_id, s.name, s.sort_order
                   ORDER BY s.sort_order, s.name""",
                (board_id, standard_id)
            )
            return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def get_chapters_with_progress(
        user_id: str,
        board_id: str,
        standard_id: str,
        subject_id: str
    ) -> List[Dict]:
        """
        Get chapters with user's progress data.
        Uses 5 checkpoints, each worth 20%:
        □ Has notes/uploads → +20%
        □ Watched videos → +20%
        □ Has flashcards → +20%
        □ Took quiz → +20%
        □ Quiz ≥70% (with at least 5 quizzes) → +20%
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Resolve school_id for the user
            school_id = None
            if user_id:
                cur.execute("SELECT school_id FROM users WHERE id = %s", (user_id,))
                urow = cur.fetchone()
                if urow:
                    school_id = urow.get("school_id")
            
            # Get base chapters
            chapters = ChapterService.list_chapters(
                board_id=board_id, standard_id=standard_id, subject_id=subject_id,
                is_active=True, school_id=school_id
            )
            
            if not chapters:
                return []
            
            # Get chapter IDs
            chapter_ids = [c["id"] for c in chapters]
            
            # Get per-chapter quiz progress from chapter_quiz_history
            cur.execute(
                """SELECT chapter_id, 
                          COUNT(*) as quiz_count,
                          COALESCE(AVG(score * 100.0 / NULLIF(total, 0)), 0) as avg_score
                   FROM chapter_quiz_history
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            quiz_progress = {row["chapter_id"]: {
                "count": row["quiz_count"],
                "avg_score": int(row["avg_score"])
            } for row in cur.fetchall()}
            
            # Get per-chapter notes count
            cur.execute(
                """SELECT chapter_id, COUNT(*) as count
                   FROM chapter_notes
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            notes_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Get per-chapter uploads count
            cur.execute(
                """SELECT chapter_id, COUNT(*) as count
                   FROM chapter_uploads
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            uploads_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Get per-chapter video history count
            cur.execute(
                """SELECT chapter_id, COUNT(DISTINCT video_id) as count
                   FROM chapter_video_history
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            videos_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Get per-chapter flashcard sets count
            cur.execute(
                """SELECT chapter_id, COUNT(*) as count
                   FROM chapter_flashcard_sets
                   WHERE user_id = %s AND chapter_id = ANY(%s)
                   GROUP BY chapter_id""",
                (user_id, chapter_ids)
            )
            flashcards_count = {row["chapter_id"]: row["count"] for row in cur.fetchall()}
            
            # Attach checkpoint-based progress to each chapter
            for chapter in chapters:
                cid = chapter["id"]
                quiz_data = quiz_progress.get(cid, {})
                notes = notes_count.get(cid, 0) + uploads_count.get(cid, 0)
                videos = videos_count.get(cid, 0)
                flashcards = flashcards_count.get(cid, 0)
                quiz_count = quiz_data.get("count", 0)
                quiz_avg = quiz_data.get("avg_score", 0)
                
                # 5 Checkpoints, each worth 20%:
                progress = 0
                
                # □ Has notes/uploads → +20%
                if notes > 0:
                    progress += 20
                
                # □ Watched videos → +20%
                if videos > 0:
                    progress += 20
                
                # □ Has flashcards → +20%
                if flashcards > 0:
                    progress += 20
                
                # □ Took at least 5 quizzes → +20%
                if quiz_count >= 5:
                    progress += 20
                    
                    # □ Quiz avg ≥70% (only counts after 5 quizzes) → +20%
                    if quiz_avg >= 70:
                        progress += 20
                
                chapter["progress_percent"] = progress
                chapter["quiz_count"] = quiz_count
                chapter["quiz_score"] = quiz_avg if quiz_data else None
                chapter["notes_count"] = notes
                chapter["videos_count"] = videos
                chapter["flashcards_count"] = flashcards
                chapter["last_studied"] = None  # Could add from chapter activity tracking
            
            return chapters
        finally:
            conn.close()
    
    @staticmethod
    def bulk_create_chapters(chapters: List[ChapterCreate], school_id: int = None) -> int:
        """
        Bulk create chapters (for seeding).
        Returns count of created chapters.
        """
        conn = get_db()
        try:
            cur = conn.cursor()
            created = 0
            
            for data in chapters:
                try:
                    # Skip if exists
                    cur.execute(
                        """SELECT id FROM chapters
                           WHERE board_id = %s AND standard_id = %s AND subject_id = %s AND chapter_number = %s""",
                        (data.board_id, data.standard_id, data.subject_id, data.chapter_number)
                    )
                    if cur.fetchone():
                        continue
                    
                    topics_json = json.dumps(data.topics or [])
                    cur.execute(
                        """INSERT INTO chapters (board_id, standard_id, subject_id, chapter_number, chapter_name,
                                                 chapter_name_local, description, topics, is_active)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (data.board_id, data.standard_id, data.subject_id, data.chapter_number, data.chapter_name,
                         data.chapter_name_local, data.description, topics_json, data.is_active)
                    )
                    created += 1
                except Exception as e:
                    logger.warning(f"Skipped chapter {data.chapter_name}: {e}")
                    continue
            
            conn.commit()
            return created
        except Exception as e:
            conn.rollback()
            logger.error(f"Bulk create failed: {e}")
            raise HTTPException(status_code=500, detail="Bulk create failed")
        finally:
            conn.close()

    @staticmethod
    def bulk_delete_chapters(ids: List[int], school_id: int = None) -> int:
        """
        Bulk delete chapters by IDs.
        Returns count of deleted chapters.
        """
        if not ids:
            return 0
            
        conn = get_db()
        try:
            cur = conn.cursor()
            if school_id is not None:
                cur.execute(
                    "DELETE FROM chapters WHERE id = ANY(%s) AND school_id = %s RETURNING id",
                    (ids, school_id)
                )
            else:
                cur.execute(
                    "DELETE FROM chapters WHERE id = ANY(%s) RETURNING id",
                    (ids,)
                )
            deleted = cur.rowcount
            conn.commit()
            return deleted
        except Exception as e:
            conn.rollback()
            logger.error(f"Bulk delete failed: {e}")
            raise HTTPException(status_code=500, detail="Bulk delete failed")
        finally:
            conn.close()
