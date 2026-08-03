"""
Chapter Progress Service - Business logic for chapter progress tracking.
"""
import json
import uuid
from datetime import datetime
from typing import List, Optional

from app.db.connection import get_db
from app.modules.chapter_progress.schemas import (
    NoteCreate, NoteUpdate, NoteResponse,
    SummarySave, SummaryResponse,
    UploadCreate, UploadResponse,
    QuizHistorySave, QuizHistoryResponse,
    QuizBookmarkSave, QuizBookmarkResponse,
    VideoHistorySave, VideoHistoryResponse,
    VideoBookmarkSave, VideoBookmarkResponse,
    FlashcardSetSave, FlashcardSetUpdate, FlashcardSetResponse,
    ChatSessionResponse, ChatMessageSave, ChatMessageResponse,
)


class ChapterProgressService:
    """Service for chapter progress operations."""

    # ── Notes ──────────────────────────────────────────────────

    @staticmethod
    def get_notes(user_id: str, chapter_id: int) -> List[NoteResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, content, created_at, updated_at
            FROM chapter_notes
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY updated_at DESC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            NoteResponse(
                id=r['id'], chapter_id=r['chapter_id'], content=r['content'],
                created_at=r['created_at'], updated_at=r['updated_at']
            ) for r in rows
        ]

    @staticmethod
    def create_note(user_id: str, chapter_id: int, data: NoteCreate) -> NoteResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        cur.execute("""
            INSERT INTO chapter_notes (user_id, chapter_id, content, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, chapter_id, data.content, now, now))
        note_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return NoteResponse(
            id=note_id, chapter_id=chapter_id, content=data.content,
            created_at=now, updated_at=now
        )

    @staticmethod
    def update_note(user_id: str, note_id: int, data: NoteUpdate) -> Optional[NoteResponse]:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        cur.execute("""
            UPDATE chapter_notes
            SET content = %s, updated_at = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, chapter_id, content, created_at, updated_at
        """, (data.content, now, note_id, user_id))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            return None
        return NoteResponse(
            id=row['id'], chapter_id=row['chapter_id'], content=row['content'],
            created_at=row['created_at'], updated_at=row['updated_at']
        )

    @staticmethod
    def delete_note(user_id: str, note_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_notes WHERE id = %s AND user_id = %s
        """, (note_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    # ── Summaries ──────────────────────────────────────────────

    @staticmethod
    def get_summary(user_id: str, chapter_id: int) -> Optional[SummaryResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, summary, key_points, generated_at
            FROM chapter_summaries
            WHERE user_id = %s AND chapter_id = %s
        """, (user_id, chapter_id))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return None
        return SummaryResponse(
            id=row['id'], chapter_id=row['chapter_id'], summary=row['summary'],
            key_points=json.loads(row['key_points'] or '[]'),
            generated_at=row['generated_at']
        )

    @staticmethod
    def save_summary(user_id: str, chapter_id: int, data: SummarySave) -> SummaryResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        key_points_json = json.dumps(data.key_points)
        cur.execute("""
            INSERT INTO chapter_summaries (user_id, chapter_id, summary, key_points, generated_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id, chapter_id) DO UPDATE
            SET summary = EXCLUDED.summary, key_points = EXCLUDED.key_points, generated_at = EXCLUDED.generated_at
            RETURNING id
        """, (user_id, chapter_id, data.summary, key_points_json, now))
        summary_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return SummaryResponse(
            id=summary_id, chapter_id=chapter_id, summary=data.summary,
            key_points=data.key_points, generated_at=now
        )

    # ── Uploads ────────────────────────────────────────────────

    @staticmethod
    def get_uploads(user_id: str, chapter_id: int) -> List[UploadResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, name, url, file_type, file_size, uploaded_at,
                   extraction_status, extraction_error,
                   (extracted_text IS NOT NULL AND extracted_text != '') as has_content
            FROM chapter_uploads
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY uploaded_at DESC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            UploadResponse(
                id=r['id'], chapter_id=r['chapter_id'], name=r['name'], url=r['url'],
                file_type=r['file_type'], file_size=r['file_size'], uploaded_at=r['uploaded_at'],
                extraction_status=r['extraction_status'] or 'pending',
                extraction_error=r['extraction_error'],
                has_content=bool(r['has_content'])
            ) for r in rows
        ]

    @staticmethod
    def create_upload(user_id: str, chapter_id: int, data: UploadCreate) -> UploadResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        cur.execute("""
            INSERT INTO chapter_uploads (user_id, chapter_id, name, url, file_type, file_size, uploaded_at, extraction_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
            RETURNING id
        """, (user_id, chapter_id, data.name, data.url, data.file_type, data.file_size, now))
        upload_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return UploadResponse(
            id=upload_id, chapter_id=chapter_id, name=data.name, url=data.url,
            file_type=data.file_type, file_size=data.file_size, uploaded_at=now,
            extraction_status='pending', extraction_error=None, has_content=False
        )

    @staticmethod
    def delete_upload(user_id: str, upload_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_uploads WHERE id = %s AND user_id = %s
        """, (upload_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    @staticmethod
    def get_extracted_content(user_id: str, chapter_id: int) -> str:
        """Get combined extracted text from all uploads for AI context."""
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT name, extracted_text, file_type
            FROM chapter_uploads
            WHERE user_id = %s AND chapter_id = %s
              AND extraction_status = 'completed'
              AND extracted_text IS NOT NULL AND extracted_text != ''
            ORDER BY uploaded_at ASC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        if not rows:
            return ""
        
        parts = []
        for row in rows:
            parts.append(f"=== Source: {row['name']} ({row['file_type']}) ===\n{row['extracted_text']}")
        
        return "\n\n".join(parts)

    # ── Quiz History ───────────────────────────────────────────

    @staticmethod
    def get_quiz_history(user_id: str, chapter_id: int) -> List[QuizHistoryResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, mode, score, total, time_spent, questions, completed_at
            FROM chapter_quiz_history
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY completed_at DESC
            LIMIT 50
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            QuizHistoryResponse(
                id=r['id'], chapter_id=r['chapter_id'], mode=r['mode'], score=r['score'], total=r['total'],
                time_spent=r['time_spent'], questions=json.loads(r['questions'] or '[]'), completed_at=r['completed_at']
            ) for r in rows
        ]

    @staticmethod
    def save_quiz_history(user_id: str, chapter_id: int, data: QuizHistorySave) -> QuizHistoryResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        questions_json = json.dumps(data.questions)
        cur.execute("""
            INSERT INTO chapter_quiz_history (user_id, chapter_id, mode, score, total, time_spent, questions, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, chapter_id, data.mode, data.score, data.total, data.time_spent, questions_json, now))
        history_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return QuizHistoryResponse(
            id=history_id, chapter_id=chapter_id, mode=data.mode, score=data.score,
            total=data.total, time_spent=data.time_spent, questions=data.questions, completed_at=now
        )

    @staticmethod
    def delete_quiz_history(user_id: str, history_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_quiz_history WHERE id = %s AND user_id = %s
        """, (history_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    # ── Quiz Bookmarks ─────────────────────────────────────────

    @staticmethod
    def get_quiz_bookmarks(user_id: str, chapter_id: int) -> List[QuizBookmarkResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, question, options, correct_idx, explanation, bookmarked_at
            FROM chapter_quiz_bookmarks
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY bookmarked_at DESC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            QuizBookmarkResponse(
                id=r['id'], chapter_id=r['chapter_id'], question=r['question'], options=json.loads(r['options'] or '[]'),
                correct_idx=r['correct_idx'], explanation=r['explanation'], bookmarked_at=r['bookmarked_at']
            ) for r in rows
        ]

    @staticmethod
    def save_quiz_bookmark(user_id: str, chapter_id: int, data: QuizBookmarkSave) -> QuizBookmarkResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        options_json = json.dumps(data.options)
        cur.execute("""
            INSERT INTO chapter_quiz_bookmarks (user_id, chapter_id, question, options, correct_idx, explanation, bookmarked_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, chapter_id, data.question, options_json, data.correct_idx, data.explanation, now))
        bookmark_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return QuizBookmarkResponse(
            id=bookmark_id, chapter_id=chapter_id, question=data.question, options=data.options,
            correct_idx=data.correct_idx, explanation=data.explanation, bookmarked_at=now
        )

    @staticmethod
    def delete_quiz_bookmark(user_id: str, bookmark_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_quiz_bookmarks WHERE id = %s AND user_id = %s
        """, (bookmark_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    # ── Video History ──────────────────────────────────────────

    @staticmethod
    def get_video_history(user_id: str, chapter_id: int) -> List[VideoHistoryResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, video_id, title, search_query, youtube_video_id, watched_at
            FROM chapter_video_history
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY watched_at DESC
            LIMIT 50
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            VideoHistoryResponse(
                id=r['id'], chapter_id=r['chapter_id'], video_id=r['video_id'], title=r['title'],
                search_query=r['search_query'], youtube_video_id=r['youtube_video_id'], watched_at=r['watched_at']
            ) for r in rows
        ]

    @staticmethod
    def save_video_history(user_id: str, chapter_id: int, data: VideoHistorySave) -> VideoHistoryResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        cur.execute("""
            INSERT INTO chapter_video_history (user_id, chapter_id, video_id, title, search_query, youtube_video_id, watched_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, chapter_id, data.video_id, data.title, data.search_query, data.youtube_video_id, now))
        history_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return VideoHistoryResponse(
            id=history_id, chapter_id=chapter_id, video_id=data.video_id, title=data.title,
            search_query=data.search_query, youtube_video_id=data.youtube_video_id, watched_at=now
        )

    @staticmethod
    def delete_video_history(user_id: str, history_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_video_history WHERE id = %s AND user_id = %s
        """, (history_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    # ── Video Bookmarks ────────────────────────────────────────

    @staticmethod
    def get_video_bookmarks(user_id: str, chapter_id: int) -> List[VideoBookmarkResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, video_id, title, description, concept, search_query, youtube_video_id, bookmarked_at
            FROM chapter_video_bookmarks
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY bookmarked_at DESC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            VideoBookmarkResponse(
                id=r['id'], chapter_id=r['chapter_id'], video_id=r['video_id'], title=r['title'],
                description=r['description'], concept=r['concept'], search_query=r['search_query'], youtube_video_id=r['youtube_video_id'], bookmarked_at=r['bookmarked_at']
            ) for r in rows
        ]

    @staticmethod
    def save_video_bookmark(user_id: str, chapter_id: int, data: VideoBookmarkSave) -> VideoBookmarkResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        # Use upsert to avoid duplicates
        cur.execute("""
            INSERT INTO chapter_video_bookmarks (user_id, chapter_id, video_id, title, description, concept, search_query, youtube_video_id, bookmarked_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, video_id) DO UPDATE
            SET title = EXCLUDED.title, description = EXCLUDED.description, concept = EXCLUDED.concept, 
                search_query = EXCLUDED.search_query, youtube_video_id = EXCLUDED.youtube_video_id, bookmarked_at = EXCLUDED.bookmarked_at
            RETURNING id
        """, (user_id, chapter_id, data.video_id, data.title, data.description, data.concept, data.search_query, data.youtube_video_id, now))
        bookmark_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return VideoBookmarkResponse(
            id=bookmark_id, chapter_id=chapter_id, video_id=data.video_id, title=data.title,
            description=data.description, concept=data.concept, search_query=data.search_query, 
            youtube_video_id=data.youtube_video_id, bookmarked_at=now
        )

    @staticmethod
    def delete_video_bookmark(user_id: str, bookmark_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_video_bookmarks WHERE id = %s AND user_id = %s
        """, (bookmark_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    # ── Flashcard Sets ─────────────────────────────────────────

    @staticmethod
    def get_flashcard_sets(user_id: str, chapter_id: int) -> List[FlashcardSetResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, name, cards, mastery, reviewed_count, created_at, updated_at
            FROM chapter_flashcard_sets
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY updated_at DESC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            FlashcardSetResponse(
                id=r['id'], chapter_id=r['chapter_id'], chapter_name=r['name'], cards=json.loads(r['cards'] or '[]'),
                mastery=json.loads(r['mastery'] or '{}'), reviewed_count=r['reviewed_count'] or 0, created_at=r['created_at'], updated_at=r['updated_at']
            ) for r in rows
        ]

    @staticmethod
    def save_flashcard_set(user_id: str, chapter_id: int, data: FlashcardSetSave) -> FlashcardSetResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        cards_json = json.dumps(data.cards)
        cur.execute("""
            INSERT INTO chapter_flashcard_sets (user_id, chapter_id, name, cards, mastery, reviewed_count, created_at, updated_at)
            VALUES (%s, %s, %s, %s, '{}', 0, %s, %s)
            RETURNING id
        """, (user_id, chapter_id, data.name, cards_json, now, now))
        set_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        return FlashcardSetResponse(
            id=set_id, chapter_id=chapter_id, chapter_name=data.name, cards=data.cards,
            mastery={}, reviewed_count=0, created_at=now, updated_at=now
        )

    @staticmethod
    def update_flashcard_set(user_id: str, set_id: int, data: FlashcardSetUpdate) -> Optional[FlashcardSetResponse]:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        
        # Build update query dynamically
        updates = ["updated_at = %s"]
        params = [now]
        
        if data.name is not None:
            updates.append("name = %s")
            params.append(data.name)
        if data.cards is not None:
            updates.append("cards = %s")
            params.append(json.dumps(data.cards))
        if data.mastery is not None:
            updates.append("mastery = %s")
            params.append(json.dumps(data.mastery))
        if data.reviewed_count is not None:
            updates.append("reviewed_count = %s")
            params.append(data.reviewed_count)
        
        params.extend([set_id, user_id])
        
        cur.execute(f"""
            UPDATE chapter_flashcard_sets
            SET {', '.join(updates)}
            WHERE id = %s AND user_id = %s
            RETURNING id, chapter_id, name, cards, mastery, reviewed_count, created_at, updated_at
        """, params)
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if not row:
            return None
        return FlashcardSetResponse(
            id=row['id'], chapter_id=row['chapter_id'], chapter_name=row['name'], cards=json.loads(row['cards'] or '[]'),
            mastery=json.loads(row['mastery'] or '{}'), reviewed_count=row['reviewed_count'] or 0, created_at=row['created_at'], updated_at=row['updated_at']
        )

    @staticmethod
    def delete_flashcard_set(user_id: str, set_id: int) -> bool:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM chapter_flashcard_sets WHERE id = %s AND user_id = %s
        """, (set_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted

    # ── AI Chat Sessions ───────────────────────────────────────

    @staticmethod
    def get_chat_sessions(user_id: str, chapter_id: int) -> List[ChatSessionResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chapter_id, title, created_at, updated_at
            FROM chapter_ai_sessions
            WHERE user_id = %s AND chapter_id = %s
            ORDER BY updated_at DESC
        """, (user_id, chapter_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            ChatSessionResponse(
                id=r['id'], chapter_id=r['chapter_id'], title=r['title'], created_at=r['created_at'], updated_at=r['updated_at']
            ) for r in rows
        ]

    @staticmethod
    def create_chat_session(user_id: str, chapter_id: int, title: str = "New Chat") -> ChatSessionResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        session_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO chapter_ai_sessions (id, user_id, chapter_id, title, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (session_id, user_id, chapter_id, title, now, now))
        conn.commit()
        cur.close()
        conn.close()
        return ChatSessionResponse(
            id=session_id, chapter_id=chapter_id, title=title, created_at=now, updated_at=now
        )

    @staticmethod
    def get_chat_messages(user_id: str, session_id: str) -> List[ChatMessageResponse]:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, session_id, role, content, created_at
            FROM chapter_ai_chats
            WHERE user_id = %s AND session_id = %s
            ORDER BY created_at ASC
        """, (user_id, session_id))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            ChatMessageResponse(
                id=r['id'], session_id=r['session_id'], role=r['role'], content=r['content'], created_at=r['created_at']
            ) for r in rows
        ]

    @staticmethod
    def save_chat_message(user_id: str, chapter_id: int, session_id: str, data: ChatMessageSave) -> ChatMessageResponse:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.utcnow()
        cur.execute("""
            INSERT INTO chapter_ai_chats (user_id, chapter_id, session_id, role, content, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (user_id, chapter_id, session_id, data.role, data.content, now))
        msg_id = cur.fetchone()['id']
        
        # Update session's updated_at and title if it's the first user message
        if data.role == 'user':
            title = data.content[:50] + ('...' if len(data.content) > 50 else '')
            cur.execute("""
                UPDATE chapter_ai_sessions
                SET updated_at = %s, title = CASE WHEN title = 'New Chat' THEN %s ELSE title END
                WHERE id = %s AND user_id = %s
            """, (now, title, session_id, user_id))
        
        conn.commit()
        cur.close()
        conn.close()
        return ChatMessageResponse(
            id=msg_id, session_id=session_id, role=data.role, content=data.content, created_at=now
        )

    @staticmethod
    def delete_chat_session(user_id: str, session_id: str) -> bool:
        conn = get_db()
        cur = conn.cursor()
        # Delete messages first
        cur.execute("""
            DELETE FROM chapter_ai_chats WHERE session_id = %s AND user_id = %s
        """, (session_id, user_id))
        # Then delete session
        cur.execute("""
            DELETE FROM chapter_ai_sessions WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        conn.close()
        return deleted
