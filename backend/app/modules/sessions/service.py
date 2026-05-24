"""
Sessions Service - Business logic for chat sessions and drafts.
"""
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db.connection import get_db


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


class SessionsService:
    """Sessions business logic."""
    
    @staticmethod
    def get_chat_session(user_id: str, current_user: str, session: str) -> List[Dict]:
        """Get chat session messages."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT role, content FROM chat_sessions WHERE user_id = %s AND session = %s ORDER BY id ASC",
                (user_id, session)
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def append_chat_message(user_id: str, current_user: str, session: str, role: str, content: str) -> Dict:
        """Append message to chat session."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            # Keep at most 100 messages per session
            cur.execute(
                """DELETE FROM chat_sessions WHERE user_id = %s AND session = %s AND id IN (
                   SELECT id FROM chat_sessions WHERE user_id = %s AND session = %s
                   ORDER BY id ASC OFFSET 99
                )""",
                (user_id, session, user_id, session)
            )
            cur.execute(
                "INSERT INTO chat_sessions (user_id, session, role, content) VALUES (%s, %s, %s, %s)",
                (user_id, session, role, content)
            )
            conn.commit()
            return {"saved": True}
        finally:
            conn.close()
    
    @staticmethod
    def clear_chat_session(user_id: str, current_user: str, session: str) -> Dict:
        """Clear chat session."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM chat_sessions WHERE user_id = %s AND session = %s",
                (user_id, session)
            )
            conn.commit()
            return {"deleted": True}
        finally:
            conn.close()
    
    @staticmethod
    def get_draft(user_id: str, current_user: str, key: str) -> Optional[Dict]:
        """Get a draft."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT content, extra FROM user_drafts WHERE user_id = %s AND draft_key = %s",
                (user_id, key)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    
    @staticmethod
    def save_draft(user_id: str, current_user: str, key: str, content: str, extra: str = "") -> Dict:
        """Save a draft."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO user_drafts (user_id, draft_key, content, extra)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (user_id, draft_key)
                   DO UPDATE SET content = EXCLUDED.content, extra = EXCLUDED.extra, updated_at = NOW()""",
                (user_id, key, content, extra)
            )
            conn.commit()
            return {"saved": True}
        finally:
            conn.close()
    
    @staticmethod
    def delete_draft(user_id: str, current_user: str, key: str) -> Dict:
        """Delete a draft."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM user_drafts WHERE user_id = %s AND draft_key = %s",
                (user_id, key)
            )
            conn.commit()
            return {"deleted": True}
        finally:
            conn.close()
