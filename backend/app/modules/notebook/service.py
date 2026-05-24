"""
Notebook Service - Business logic for notebook sources and chat.
"""
from typing import Dict, List
from fastapi import HTTPException

from app.db.connection import get_db, row_to_dict


def _require_own(user_id: str, current_user: str):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")


class NotebookService:
    """Notebook business logic."""
    
    @staticmethod
    def get_sources(user_id: str, current_user: str) -> List[Dict]:
        """Get all notebook sources for user."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, type, content, icon, added_at FROM notebook_sources WHERE user_id = %s ORDER BY added_at ASC",
                (user_id,)
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def add_source(
        user_id: str,
        current_user: str,
        source_id: str,
        name: str,
        source_type: str,
        content: str,
        icon: str,
        added_at: int
    ) -> Dict:
        """Add or update a notebook source."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO notebook_sources (id, user_id, name, type, content, icon, added_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (id, user_id) DO UPDATE
                   SET name = EXCLUDED.name, content = EXCLUDED.content""",
                (source_id, user_id, name, source_type, content, icon, added_at)
            )
            conn.commit()
            return {"saved": True}
        finally:
            conn.close()
    
    @staticmethod
    def delete_source(user_id: str, current_user: str, source_id: str) -> Dict:
        """Delete a notebook source."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM notebook_sources WHERE user_id = %s AND id = %s",
                (user_id, source_id)
            )
            conn.commit()
            return {"deleted": True}
        finally:
            conn.close()
    
    @staticmethod
    def clear_sources(user_id: str, current_user: str) -> Dict:
        """Clear all notebook sources."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM notebook_sources WHERE user_id = %s", (user_id,))
            conn.commit()
            return {"deleted": True}
        finally:
            conn.close()
    
    @staticmethod
    def get_chat(user_id: str, current_user: str) -> List[Dict]:
        """Get notebook chat history."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT role, content FROM notebook_chats WHERE user_id = %s ORDER BY id ASC",
                (user_id,)
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def add_chat_message(user_id: str, current_user: str, role: str, content: str) -> Dict:
        """Add a chat message."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO notebook_chats (user_id, role, content) VALUES (%s, %s, %s)",
                (user_id, role, content)
            )
            conn.commit()
            return {"saved": True}
        finally:
            conn.close()
    
    @staticmethod
    def clear_chat(user_id: str, current_user: str) -> Dict:
        """Clear chat history."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM notebook_chats WHERE user_id = %s", (user_id,))
            conn.commit()
            return {"deleted": True}
        finally:
            conn.close()
