"""
Home Service - Business logic for daily content.
"""
from typing import Dict, List, Optional
from datetime import date

from app.db.connection import get_db


class HomeService:
    """Home page business logic."""

    @staticmethod
    def get_recent_practice(user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent practice activity across quizzes, battles, and chapter quizzes."""
        conn = get_db()
        try:
            cur = conn.cursor()
            # Union of 3 activity sources, ordered by time DESC
            cur.execute("""
                (
                    SELECT 'quiz' AS type, subject, difficulty,
                           correct AS score, total, NULL AS opponent_name,
                           NULL AS result, NULL AS chapter_name,
                           created_at AS completed_at
                    FROM quiz_results
                    WHERE user_id = %s
                    ORDER BY created_at DESC LIMIT %s
                )
                UNION ALL
                (
                    SELECT 'battle' AS type, subject, difficulty,
                           CASE WHEN winner_id = %s THEN challenger_score
                                WHEN challenger_id = %s THEN challenger_score
                                ELSE opponent_score END AS score,
                           CASE WHEN challenger_id = %s THEN opponent_score
                                ELSE challenger_score END AS total,
                           CASE WHEN challenger_id = %s THEN opponent_name
                                ELSE challenger_name END AS opponent_name,
                           CASE WHEN winner_id = %s THEN 'won'
                                WHEN winner_id IS NULL AND status = 'completed' THEN 'draw'
                                WHEN status = 'completed' THEN 'lost'
                                ELSE status END AS result,
                           NULL AS chapter_name,
                           COALESCE(completed_at, created_at) AS completed_at
                    FROM muqabla_battles
                    WHERE (challenger_id = %s OR opponent_id = %s)
                      AND status IN ('completed', 'expired')
                    ORDER BY COALESCE(completed_at, created_at) DESC LIMIT %s
                )
                UNION ALL
                (
                    SELECT 'chapter_quiz' AS type,
                           c.subject, cqh.mode AS difficulty,
                           cqh.score, cqh.total,
                           NULL AS opponent_name, NULL AS result,
                           c.chapter_name,
                           cqh.completed_at
                    FROM chapter_quiz_history cqh
                    JOIN chapters c ON c.id = cqh.chapter_id
                    WHERE cqh.user_id = %s
                    ORDER BY cqh.completed_at DESC LIMIT %s
                )
                ORDER BY completed_at DESC
                LIMIT %s
            """, (
                user_id, limit,
                user_id, user_id, user_id, user_id, user_id, user_id, user_id, limit,
                user_id, limit,
                limit
            ))
            
            rows = cur.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"[RecentPractice] Error: {e}")
            return []
        finally:
            conn.close()

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
