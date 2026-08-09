"""
Content Studio Service - Business logic for questions, media, and assessments.
"""
import json
from typing import List, Optional, Tuple
from uuid import uuid4

from app.db.connection import get_db
from app.modules.content.schemas import (
    QuestionCreate, QuestionUpdate, QuestionResponse, QuestionListParams,
    MediaCreate, MediaUpdate, MediaResponse, MediaListParams,
    AssessmentCreate, AssessmentUpdate, AssessmentResponse, AssessmentListParams,
)


# ══════════════════════════════════════════════════════════════
# QUESTIONS SERVICE
# ══════════════════════════════════════════════════════════════

async def list_questions(params: QuestionListParams) -> Tuple[List[QuestionResponse], int]:
    """List questions with filters and pagination."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Build WHERE clause
            conditions = []
            values = []
            
            if params.chapter_id:
                conditions.append("q.chapter_id = %s")
                values.append(params.chapter_id)
            
            if params.subject_id:
                conditions.append("c.subject_id = %s")
                values.append(params.subject_id)
            
            if params.type:
                conditions.append("q.type = %s")
                values.append(params.type)
            
            if params.difficulty:
                conditions.append("q.difficulty = %s")
                values.append(params.difficulty)
            
            if params.is_active is not None:
                conditions.append("q.is_active = %s")
                values.append(params.is_active)
            
            if params.search:
                conditions.append("q.question ILIKE %s")
                values.append(f"%{params.search}%")
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # Count total
            count_sql = f"""
                SELECT COUNT(*) as cnt FROM questions q
                LEFT JOIN chapters c ON q.chapter_id = c.id
                WHERE {where_clause}
            """
            cur.execute(count_sql, values)
            total = cur.fetchone()['cnt']
            
            # Fetch questions
            query_sql = f"""
                SELECT 
                    q.id, q.chapter_id, q.type, q.difficulty, q.question,
                    q.options, q.correct_answer, q.explanation, q.tags,
                    q.times_used, q.correct_count, q.is_active, q.created_by, q.created_at,
                    c.chapter_name as chapter_name, s.name as subject_name
                FROM questions q
                LEFT JOIN chapters c ON q.chapter_id = c.id
                LEFT JOIN subjects s ON c.subject_id = s.id
                WHERE {where_clause}
                ORDER BY q.created_at DESC
                LIMIT %s OFFSET %s
            """
            cur.execute(query_sql, values + [params.limit, params.offset])
            rows = cur.fetchall()
            
            questions = []
            for row in rows:
                times_used = row['times_used'] or 0
                correct_count = row['correct_count'] or 0
                accuracy = (correct_count / times_used * 100) if times_used > 0 else 0.0
                questions.append(QuestionResponse(
                    id=row['id'],
                    chapter_id=row['chapter_id'],
                    type=row['type'],
                    difficulty=row['difficulty'],
                    question=row['question'],
                    options=row['options'] or [],
                    correct_answer=row['correct_answer'],
                    explanation=row['explanation'] or '',
                    tags=row['tags'] or [],
                    times_used=times_used,
                    correct_count=correct_count,
                    is_active=row['is_active'],
                    created_by=row['created_by'] or '',
                    created_at=row['created_at'],
                    accuracy_rate=round(accuracy, 1),
                    chapter_name=row['chapter_name'],
                    subject_name=row['subject_name']
                ))
            
            return questions, total
    finally:
        conn.close()


async def get_question(question_id: str) -> Optional[QuestionResponse]:
    """Get a single question by ID."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    q.id, q.chapter_id, q.type, q.difficulty, q.question,
                    q.options, q.correct_answer, q.explanation, q.tags,
                    q.times_used, q.correct_count, q.is_active, q.created_by, q.created_at,
                    c.chapter_name as chapter_name, s.name as subject_name
                FROM questions q
                LEFT JOIN chapters c ON q.chapter_id = c.id
                LEFT JOIN subjects s ON c.subject_id = s.id
                WHERE q.id = %s
            """, (question_id,))
            row = cur.fetchone()
            
            if not row:
                return None
            
            times_used = row['times_used'] or 0
            correct_count = row['correct_count'] or 0
            accuracy = (correct_count / times_used * 100) if times_used > 0 else 0.0
            return QuestionResponse(
                id=row['id'],
                chapter_id=row['chapter_id'],
                type=row['type'],
                difficulty=row['difficulty'],
                question=row['question'],
                options=row['options'] or [],
                correct_answer=row['correct_answer'],
                explanation=row['explanation'] or '',
                tags=row['tags'] or [],
                times_used=times_used,
                correct_count=correct_count,
                is_active=row['is_active'],
                created_by=row['created_by'] or '',
                created_at=row['created_at'],
                accuracy_rate=round(accuracy, 1),
                chapter_name=row['chapter_name'],
                subject_name=row['subject_name']
            )
    finally:
        conn.close()


async def create_question(data: QuestionCreate, created_by: str = '') -> QuestionResponse:
    """Create a new question."""
    question_id = str(uuid4())
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO questions 
                    (id, chapter_id, type, difficulty, question, options, correct_answer, explanation, tags, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (
                question_id,
                data.chapter_id,
                data.type,
                data.difficulty,
                data.question,
                data.options,
                data.correct_answer,
                data.explanation,
                data.tags,
                created_by
            ))
            row = cur.fetchone()
            conn.commit()
            
            return await get_question(row['id'])
    finally:
        conn.close()


async def create_questions_bulk(questions: List[QuestionCreate], created_by: str = '') -> int:
    """Bulk create questions. Returns count of created questions."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            created = 0
            for data in questions:
                question_id = str(uuid4())
                cur.execute("""
                    INSERT INTO questions 
                        (id, chapter_id, type, difficulty, question, options, correct_answer, explanation, tags, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    question_id,
                    data.chapter_id,
                    data.type,
                    data.difficulty,
                    data.question,
                    data.options,
                    data.correct_answer,
                    data.explanation,
                    data.tags,
                    created_by
                ))
                created += 1
            conn.commit()
            return created
    finally:
        conn.close()


async def update_question(question_id: str, data: QuestionUpdate) -> Optional[QuestionResponse]:
    """Update a question."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Build UPDATE dynamically
            updates = []
            values = []
            
            if data.type is not None:
                updates.append("type = %s")
                values.append(data.type)
            if data.difficulty is not None:
                updates.append("difficulty = %s")
                values.append(data.difficulty)
            if data.question is not None:
                updates.append("question = %s")
                values.append(data.question)
            if data.options is not None:
                updates.append("options = %s")
                values.append(data.options)
            if data.correct_answer is not None:
                updates.append("correct_answer = %s")
                values.append(data.correct_answer)
            if data.explanation is not None:
                updates.append("explanation = %s")
                values.append(data.explanation)
            if data.tags is not None:
                updates.append("tags = %s")
                values.append(data.tags)
            if data.is_active is not None:
                updates.append("is_active = %s")
                values.append(data.is_active)
            
            if not updates:
                return await get_question(question_id)
            
            values.append(question_id)
            update_sql = f"UPDATE questions SET {', '.join(updates)} WHERE id = %s"
            cur.execute(update_sql, values)
            conn.commit()
            
            return await get_question(question_id)
    finally:
        conn.close()


async def delete_question(question_id: str) -> bool:
    """Delete a question."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM questions WHERE id = %s", (question_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            return deleted
    finally:
        conn.close()


async def delete_questions_bulk(ids: List[str]) -> int:
    """Bulk delete questions. Returns count of deleted."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM questions WHERE id = ANY(%s)", (ids,))
            deleted = cur.rowcount
            conn.commit()
            return deleted
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════
# MEDIA SERVICE
# ══════════════════════════════════════════════════════════════

async def list_media(params: MediaListParams) -> Tuple[List[MediaResponse], int]:
    """List media files with filters and pagination."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Build WHERE clause
            conditions = []
            values = []
            
            if params.type:
                conditions.append("m.type = %s")
                values.append(params.type)
            
            if params.chapter_id:
                conditions.append("m.chapter_id = %s")
                values.append(params.chapter_id)
            
            if params.subject_id:
                conditions.append("m.subject_id = %s")
                values.append(params.subject_id)
            
            if params.search:
                conditions.append("m.name ILIKE %s")
                values.append(f"%{params.search}%")
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # Count total
            count_sql = f"SELECT COUNT(*) as cnt FROM media_files m WHERE {where_clause}"
            cur.execute(count_sql, values)
            total = cur.fetchone()['cnt']
            
            # Fetch media
            query_sql = f"""
                SELECT 
                    m.id, m.name, m.type, m.url, m.thumbnail_url, m.size_bytes,
                    m.duration_sec, m.dimensions, m.subject_id, m.chapter_id,
                    m.usage_count, m.uploaded_by, m.uploaded_at,
                    c.chapter_name as chapter_name, s.name as subject_name
                FROM media_files m
                LEFT JOIN chapters c ON m.chapter_id = c.id
                LEFT JOIN subjects s ON m.subject_id = s.id
                WHERE {where_clause}
                ORDER BY m.uploaded_at DESC
                LIMIT %s OFFSET %s
            """
            cur.execute(query_sql, values + [params.limit, params.offset])
            rows = cur.fetchall()
            
            media_list = []
            for row in rows:
                media_list.append(MediaResponse(
                    id=row['id'],
                    name=row['name'],
                    type=row['type'],
                    url=row['url'],
                    thumbnail_url=row['thumbnail_url'] or '',
                    size_bytes=row['size_bytes'] or 0,
                    duration_sec=row['duration_sec'],
                    dimensions=row['dimensions'] or '',
                    subject_id=row['subject_id'],
                    chapter_id=row['chapter_id'],
                    usage_count=row['usage_count'] or 0,
                    uploaded_by=row['uploaded_by'] or '',
                    uploaded_at=row['uploaded_at'],
                    chapter_name=row['chapter_name'],
                    subject_name=row['subject_name']
                ))
            
            return media_list, total
    finally:
        conn.close()


async def get_media(media_id: str) -> Optional[MediaResponse]:
    """Get a single media file by ID."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    m.id, m.name, m.type, m.url, m.thumbnail_url, m.size_bytes,
                    m.duration_sec, m.dimensions, m.subject_id, m.chapter_id,
                    m.usage_count, m.uploaded_by, m.uploaded_at,
                    c.chapter_name as chapter_name, s.name as subject_name
                FROM media_files m
                LEFT JOIN chapters c ON m.chapter_id = c.id
                LEFT JOIN subjects s ON m.subject_id = s.id
                WHERE m.id = %s
            """, (media_id,))
            row = cur.fetchone()
            
            if not row:
                return None
            
            return MediaResponse(
                id=row['id'],
                name=row['name'],
                type=row['type'],
                url=row['url'],
                thumbnail_url=row['thumbnail_url'] or '',
                size_bytes=row['size_bytes'] or 0,
                duration_sec=row['duration_sec'],
                dimensions=row['dimensions'] or '',
                subject_id=row['subject_id'],
                chapter_id=row['chapter_id'],
                usage_count=row['usage_count'] or 0,
                uploaded_by=row['uploaded_by'] or '',
                uploaded_at=row['uploaded_at'],
                chapter_name=row['chapter_name'],
                subject_name=row['subject_name']
            )
    finally:
        conn.close()


async def create_media(data: MediaCreate, uploaded_by: str = '') -> MediaResponse:
    """Create a new media entry."""
    media_id = str(uuid4())
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO media_files 
                    (id, name, type, url, thumbnail_url, size_bytes, duration_sec, dimensions, subject_id, chapter_id, uploaded_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, uploaded_at
            """, (
                media_id,
                data.name,
                data.type,
                data.url,
                data.thumbnail_url,
                data.size_bytes,
                data.duration_sec,
                data.dimensions,
                data.subject_id,
                data.chapter_id,
                uploaded_by
            ))
            row = cur.fetchone()
            conn.commit()
            
            return await get_media(row['id'])
    finally:
        conn.close()


async def update_media(media_id: str, data: MediaUpdate) -> Optional[MediaResponse]:
    """Update media metadata."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            updates = []
            values = []
            
            if data.name is not None:
                updates.append("name = %s")
                values.append(data.name)
            if data.subject_id is not None:
                updates.append("subject_id = %s")
                values.append(data.subject_id)
            if data.chapter_id is not None:
                updates.append("chapter_id = %s")
                values.append(data.chapter_id)
            
            if not updates:
                return await get_media(media_id)
            
            values.append(media_id)
            update_sql = f"UPDATE media_files SET {', '.join(updates)} WHERE id = %s"
            cur.execute(update_sql, values)
            conn.commit()
            
            return await get_media(media_id)
    finally:
        conn.close()


async def delete_media(media_id: str) -> bool:
    """Delete a media file."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM media_files WHERE id = %s", (media_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            return deleted
    finally:
        conn.close()


async def delete_media_bulk(ids: List[str]) -> int:
    """Bulk delete media files. Returns count of deleted."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM media_files WHERE id = ANY(%s)", (ids,))
            deleted = cur.rowcount
            conn.commit()
            return deleted
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════
# ASSESSMENTS SERVICE
# ══════════════════════════════════════════════════════════════

async def list_assessments(params: AssessmentListParams) -> Tuple[List[AssessmentResponse], int]:
    """List assessments with filters and pagination."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Build WHERE clause
            conditions = []
            values = []
            
            if params.board_id:
                conditions.append("a.board_id = %s")
                values.append(params.board_id)
            
            if params.standard_id:
                conditions.append("a.standard_id = %s")
                values.append(params.standard_id)
            
            if params.subject_id:
                conditions.append("a.subject_id = %s")
                values.append(params.subject_id)
            
            if params.chapter_id:
                conditions.append("a.chapter_id = %s")
                values.append(params.chapter_id)
            
            if params.type:
                conditions.append("a.type = %s")
                values.append(params.type)
            
            if params.status:
                conditions.append("a.status = %s")
                values.append(params.status)
            
            if params.search:
                conditions.append("a.title ILIKE %s")
                values.append(f"%{params.search}%")
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # Count total
            count_sql = f"SELECT COUNT(*) as cnt FROM assessments a WHERE {where_clause}"
            cur.execute(count_sql, values)
            total = cur.fetchone()['cnt']
            
            # Fetch assessments
            query_sql = f"""
                SELECT 
                    a.id, a.title, a.description, a.board_id, a.standard_id, a.subject_id,
                    a.chapter_id, a.type, a.difficulty, a.question_ids, a.time_limit_min,
                    a.total_marks, a.pass_marks, a.status, a.created_by, a.created_at, a.published_at,
                    b.name as board_name, st.name as standard_name, s.name as subject_name, c.chapter_name as chapter_name
                FROM assessments a
                LEFT JOIN boards b ON a.board_id = b.id
                LEFT JOIN standards st ON a.standard_id = st.id
                LEFT JOIN subjects s ON a.subject_id = s.id
                LEFT JOIN chapters c ON a.chapter_id = c.id
                WHERE {where_clause}
                ORDER BY a.created_at DESC
                LIMIT %s OFFSET %s
            """
            cur.execute(query_sql, values + [params.limit, params.offset])
            rows = cur.fetchall()
            
            assessments = []
            for row in rows:
                question_ids = row['question_ids'] or []
                assessments.append(AssessmentResponse(
                    id=row['id'],
                    title=row['title'],
                    description=row['description'] or '',
                    board_id=row['board_id'],
                    standard_id=row['standard_id'],
                    subject_id=row['subject_id'],
                    chapter_id=row['chapter_id'],
                    type=row['type'],
                    difficulty=row['difficulty'],
                    question_ids=question_ids,
                    time_limit_min=row['time_limit_min'],
                    total_marks=row['total_marks'] or 0,
                    pass_marks=row['pass_marks'] or 0,
                    status=row['status'],
                    created_by=row['created_by'] or '',
                    created_at=row['created_at'],
                    published_at=row['published_at'],
                    question_count=len(question_ids),
                    board_name=row['board_name'],
                    standard_name=row['standard_name'],
                    subject_name=row['subject_name'],
                    chapter_name=row['chapter_name']
                ))
            
            return assessments, total
    finally:
        conn.close()


async def get_assessment(assessment_id: int) -> Optional[AssessmentResponse]:
    """Get a single assessment by ID."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    a.id, a.title, a.description, a.board_id, a.standard_id, a.subject_id,
                    a.chapter_id, a.type, a.difficulty, a.question_ids, a.time_limit_min,
                    a.total_marks, a.pass_marks, a.status, a.created_by, a.created_at, a.published_at,
                    b.name as board_name, st.name as standard_name, s.name as subject_name, c.chapter_name as chapter_name
                FROM assessments a
                LEFT JOIN boards b ON a.board_id = b.id
                LEFT JOIN standards st ON a.standard_id = st.id
                LEFT JOIN subjects s ON a.subject_id = s.id
                LEFT JOIN chapters c ON a.chapter_id = c.id
                WHERE a.id = %s
            """, (assessment_id,))
            row = cur.fetchone()
            
            if not row:
                return None
            
            question_ids = row['question_ids'] or []
            return AssessmentResponse(
                id=row['id'],
                title=row['title'],
                description=row['description'] or '',
                board_id=row['board_id'],
                standard_id=row['standard_id'],
                subject_id=row['subject_id'],
                chapter_id=row['chapter_id'],
                type=row['type'],
                difficulty=row['difficulty'],
                question_ids=question_ids,
                time_limit_min=row['time_limit_min'],
                total_marks=row['total_marks'] or 0,
                pass_marks=row['pass_marks'] or 0,
                status=row['status'],
                created_by=row['created_by'] or '',
                created_at=row['created_at'],
                published_at=row['published_at'],
                question_count=len(question_ids),
                board_name=row['board_name'],
                standard_name=row['standard_name'],
                subject_name=row['subject_name'],
                chapter_name=row['chapter_name']
            )
    finally:
        conn.close()


async def create_assessment(data: AssessmentCreate, created_by: str = '') -> AssessmentResponse:
    """Create a new assessment."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO assessments 
                    (title, description, board_id, standard_id, subject_id, chapter_id, type, difficulty, question_ids, time_limit_min, total_marks, pass_marks, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data.title,
                data.description,
                data.board_id,
                data.standard_id,
                data.subject_id,
                data.chapter_id,
                data.type,
                data.difficulty,
                data.question_ids,
                data.time_limit_min,
                data.total_marks,
                data.pass_marks,
                created_by
            ))
            assessment_id = cur.fetchone()['id']
            conn.commit()
            
            return await get_assessment(assessment_id)
    finally:
        conn.close()


async def update_assessment(assessment_id: int, data: AssessmentUpdate) -> Optional[AssessmentResponse]:
    """Update an assessment."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            updates = []
            values = []
            
            if data.title is not None:
                updates.append("title = %s")
                values.append(data.title)
            if data.description is not None:
                updates.append("description = %s")
                values.append(data.description)
            if data.chapter_id is not None:
                updates.append("chapter_id = %s")
                values.append(data.chapter_id)
            if data.type is not None:
                updates.append("type = %s")
                values.append(data.type)
            if data.difficulty is not None:
                updates.append("difficulty = %s")
                values.append(data.difficulty)
            if data.question_ids is not None:
                updates.append("question_ids = %s")
                values.append(data.question_ids)
            if data.time_limit_min is not None:
                updates.append("time_limit_min = %s")
                values.append(data.time_limit_min)
            if data.total_marks is not None:
                updates.append("total_marks = %s")
                values.append(data.total_marks)
            if data.pass_marks is not None:
                updates.append("pass_marks = %s")
                values.append(data.pass_marks)
            if data.status is not None:
                updates.append("status = %s")
                values.append(data.status)
                if data.status == 'published':
                    updates.append("published_at = NOW()")
            
            if not updates:
                return await get_assessment(assessment_id)
            
            values.append(assessment_id)
            update_sql = f"UPDATE assessments SET {', '.join(updates)} WHERE id = %s"
            cur.execute(update_sql, values)
            conn.commit()
            
            return await get_assessment(assessment_id)
    finally:
        conn.close()


async def delete_assessment(assessment_id: int) -> bool:
    """Delete an assessment."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM assessments WHERE id = %s", (assessment_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            return deleted
    finally:
        conn.close()


async def delete_assessments_bulk(ids: List[int]) -> int:
    """Bulk delete assessments. Returns count of deleted."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM assessments WHERE id = ANY(%s)", (ids,))
            deleted = cur.rowcount
            conn.commit()
            return deleted
    finally:
        conn.close()


async def publish_assessment(assessment_id: int) -> Optional[AssessmentResponse]:
    """Publish an assessment."""
    return await update_assessment(assessment_id, AssessmentUpdate(status='published'))


async def archive_assessment(assessment_id: int) -> Optional[AssessmentResponse]:
    """Archive an assessment."""
    return await update_assessment(assessment_id, AssessmentUpdate(status='archived'))
