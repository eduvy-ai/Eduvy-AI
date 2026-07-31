"""
Coach Service - Business logic for coach session management.
"""
import json
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db.connection import get_db


class CoachService:
    """Study Coach session management service."""
    
    @staticmethod
    def save_session(
        user_id: str,
        question: str,
        title: str,
        subject: str,
        mode: str,
        response_json: dict
    ) -> Dict:
        """Save a new coach session."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Auto-generate title from question if not provided
            if not title:
                title = question[:80] + ("..." if len(question) > 80 else "")
            
            cur.execute("""
                INSERT INTO coach_sessions 
                (user_id, question, title, subject, mode, response_json)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, created_at::text
            """, (user_id, question, title, subject, mode, json.dumps(response_json)))
            
            row = cur.fetchone()
            conn.commit()
            
            return {
                "id": row["id"],
                "question": question,
                "title": title,
                "subject": subject,
                "mode": mode,
                "is_bookmarked": False,
                "created_at": row["created_at"],
            }
        finally:
            conn.close()
    
    @staticmethod
    def get_sessions(
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        subject: Optional[str] = None,
        bookmarked_only: bool = False
    ) -> Dict:
        """Get user's coach sessions with optional filtering."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build query with filters
            where_clauses = ["user_id = %s"]
            params = [user_id]
            
            if subject:
                where_clauses.append("subject = %s")
                params.append(subject)
            
            if bookmarked_only:
                where_clauses.append("is_bookmarked = TRUE")
            
            where_sql = " AND ".join(where_clauses)
            
            # Get total count
            cur.execute(f"SELECT COUNT(*) as cnt FROM coach_sessions WHERE {where_sql}", params)
            total = cur.fetchone()["cnt"]
            
            # Get sessions (without full response_json for list view)
            cur.execute(f"""
                SELECT id, question, title, subject, mode, is_bookmarked, 
                       created_at::text AS created_at
                FROM coach_sessions 
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, offset])
            
            sessions = [dict(r) for r in cur.fetchall()]
            
            return {"sessions": sessions, "total": total}
        finally:
            conn.close()
    
    @staticmethod
    def get_session(user_id: str, session_id: int) -> Dict:
        """Get a specific coach session with full response."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, question, title, subject, mode, response_json, 
                       is_bookmarked, created_at::text AS created_at
                FROM coach_sessions 
                WHERE id = %s AND user_id = %s
            """, (session_id, user_id))
            
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            
            result = dict(row)
            # Parse response_json
            try:
                result["response_json"] = json.loads(result["response_json"] or "{}")
            except (json.JSONDecodeError, TypeError):
                result["response_json"] = {}
            
            return result
        finally:
            conn.close()
    
    @staticmethod
    def toggle_bookmark(user_id: str, session_id: int, is_bookmarked: bool) -> Dict:
        """Toggle bookmark status for a session."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE coach_sessions 
                SET is_bookmarked = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, is_bookmarked
            """, (is_bookmarked, session_id, user_id))
            
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            
            conn.commit()
            return {"id": row["id"], "is_bookmarked": row["is_bookmarked"]}
        finally:
            conn.close()
    
    @staticmethod
    def delete_session(user_id: str, session_id: int) -> Dict:
        """Delete a coach session."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                DELETE FROM coach_sessions 
                WHERE id = %s AND user_id = %s
                RETURNING id
            """, (session_id, user_id))
            
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            
            conn.commit()
            return {"deleted": True, "id": row["id"]}
        finally:
            conn.close()
    
    @staticmethod
    def search_sessions(
        user_id: str,
        query: str,
        subject: Optional[str] = None,
        bookmarked_only: bool = False,
        limit: int = 50
    ) -> Dict:
        """Search coach sessions by question/title content."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Build query with filters
            where_clauses = [
                "user_id = %s",
                "(question ILIKE %s OR title ILIKE %s)"
            ]
            search_pattern = f"%{query}%"
            params = [user_id, search_pattern, search_pattern]
            
            if subject:
                where_clauses.append("subject = %s")
                params.append(subject)
            
            if bookmarked_only:
                where_clauses.append("is_bookmarked = TRUE")
            
            where_sql = " AND ".join(where_clauses)
            
            cur.execute(f"""
                SELECT id, question, title, subject, mode, is_bookmarked,
                       created_at::text AS created_at
                FROM coach_sessions 
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT %s
            """, params + [limit])
            
            sessions = [dict(r) for r in cur.fetchall()]
            
            return {"sessions": sessions, "total": len(sessions)}
        finally:
            conn.close()
    
    @staticmethod
    def get_subjects(user_id: str) -> List[str]:
        """Get distinct subjects from user's sessions."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT DISTINCT subject FROM coach_sessions 
                WHERE user_id = %s AND subject != ''
                ORDER BY subject
            """, (user_id,))
            
            return [r["subject"] for r in cur.fetchall()]
        finally:
            conn.close()
