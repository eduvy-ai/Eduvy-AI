"""
Home Service - Business logic for daily content.
"""
from typing import Dict, Optional
from datetime import date

from app.db.connection import get_db


class HomeService:
    """Home page business logic."""

    @staticmethod
    def get_daily_content(user_id: str, content_type: str, language: str) -> Optional[Dict]:
        """Get today's daily content for user."""
        today = date.today().isoformat()
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT content, language, date
                FROM daily_content
                WHERE user_id = %s 
                  AND content_type = %s 
                  AND language = %s
                  AND date = %s
            """, (user_id, content_type, language, today))
            
            row = cur.fetchone()
            if not row:
                return None
            
            return {
                "content_type": content_type,
                "content": row["content"],
                "language": row["language"],
                "date": row["date"],
                "exists": True
            }
        finally:
            conn.close()

    @staticmethod
    def save_daily_content(
        user_id: str,
        content_type: str,
        content: str,
        language: str
    ) -> Dict:
        """Save today's daily content for user."""
        today = date.today().isoformat()
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Upsert - insert or update if exists
            cur.execute("""
                INSERT INTO daily_content (user_id, content_type, content, language, date)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, content_type, language, date)
                DO UPDATE SET content = EXCLUDED.content
                RETURNING content, language, date
            """, (user_id, content_type, content, language, today))
            
            row = cur.fetchone()
            conn.commit()
            
            return {
                "content_type": content_type,
                "content": row["content"],
                "language": row["language"],
                "date": row["date"],
                "exists": True
            }
        finally:
            conn.close()
