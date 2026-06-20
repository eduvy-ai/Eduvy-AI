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
            # Try with summary column first
            try:
                cur.execute(
                    "SELECT id, name, type, content, summary, icon, added_at FROM notebook_sources WHERE user_id = %s ORDER BY added_at ASC",
                    (user_id,)
                )
            except Exception:
                # Summary column might not exist
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

    @staticmethod
    def get_studio_outputs(user_id: str, current_user: str) -> List[Dict]:
        """Get studio outputs for user."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, type, output_json, created_at::text AS created_at
                FROM notebook_studio
                WHERE user_id = %s
                ORDER BY id DESC LIMIT 50
            """, (user_id,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def save_studio_output(user_id: str, current_user: str,
                           output_type: str, output_json: str) -> Dict:
        """Save a studio output."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO notebook_studio (user_id, type, output_json)
                VALUES (%s, %s, %s)
                RETURNING id, type, output_json, created_at::text AS created_at
            """, (user_id, output_type, output_json))
            conn.commit()
            return dict(cur.fetchone())
        finally:
            conn.close()

    # ── Upload Status & Violation Tracking ─────────────────────

    @staticmethod
    def get_upload_status(user_id: str, current_user: str) -> Dict:
        """Get upload status: source count, violations, blocked status."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get source count first (this always works)
            cur.execute(
                "SELECT COUNT(*) as count FROM notebook_sources WHERE user_id = %s",
                (user_id,)
            )
            count_row = cur.fetchone()
            sources_count = count_row["count"] if count_row else 0
            
            # Try to get violation status (may fail if columns don't exist yet)
            violations = 0
            blocked = False
            block_reason = ""
            try:
                cur.execute("""
                    SELECT upload_violations, upload_blocked, upload_block_reason
                    FROM users WHERE id = %s
                """, (user_id,))
                user = cur.fetchone()
                if user:
                    violations = user.get("upload_violations", 0) or 0
                    blocked = user.get("upload_blocked", False) or False
                    block_reason = user.get("upload_block_reason", "") or ""
            except Exception:
                # Columns don't exist yet - that's fine, use defaults
                pass
            
            max_sources = 15
            max_violations = 5
            
            return {
                "can_upload": not blocked and sources_count < max_sources,
                "sources_count": sources_count,
                "max_sources": max_sources,
                "violations": violations,
                "max_violations": max_violations,
                "blocked": blocked,
                "block_reason": block_reason,
            }
        finally:
            conn.close()

    @staticmethod
    def report_violation(user_id: str, current_user: str, reason: str) -> Dict:
        """Report a content violation and increment counter. Block if >= 5."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            # Try to increment violation count (may fail if columns don't exist)
            try:
                cur.execute("""
                    UPDATE users 
                    SET upload_violations = upload_violations + 1
                    WHERE id = %s
                    RETURNING upload_violations
                """, (user_id,))
                result = cur.fetchone()
                new_count = result["upload_violations"] if result else 1
                
                # Block if reached 5 violations
                blocked = False
                block_reason = ""
                if new_count >= 5:
                    blocked = True
                    block_reason = "Repeated attempts to upload inappropriate content. Upload access has been blocked."
                    cur.execute("""
                        UPDATE users 
                        SET upload_blocked = TRUE, 
                            upload_block_reason = %s
                        WHERE id = %s
                    """, (block_reason, user_id))
                
                conn.commit()
                return {
                    "violations": new_count,
                    "blocked": blocked,
                    "block_reason": block_reason,
                    "remaining_attempts": max(0, 5 - new_count),
                }
            except Exception:
                # Columns don't exist - return defaults
                return {
                    "violations": 1,
                    "blocked": False,
                    "block_reason": "",
                    "remaining_attempts": 4,
                }
        finally:
            conn.close()

    @staticmethod
    def add_source_with_summary(
        user_id: str,
        current_user: str,
        source_id: str,
        name: str,
        source_type: str,
        content: str,
        summary: str,
        icon: str,
        added_at: int
    ) -> Dict:
        """Add a notebook source with AI-generated summary."""
        _require_own(user_id, current_user)
        conn = get_db()
        try:
            cur = conn.cursor()
            # Try with summary column first, fall back to without
            try:
                cur.execute(
                    """INSERT INTO notebook_sources (id, user_id, name, type, content, summary, icon, added_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (id, user_id) DO UPDATE
                       SET name = EXCLUDED.name, content = EXCLUDED.content, summary = EXCLUDED.summary""",
                    (source_id, user_id, name, source_type, content, summary, icon, added_at)
                )
            except Exception:
                # Summary column doesn't exist - use old method
                cur.execute(
                    """INSERT INTO notebook_sources (id, user_id, name, type, content, icon, added_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (id, user_id) DO UPDATE
                       SET name = EXCLUDED.name, content = EXCLUDED.content""",
                    (source_id, user_id, name, source_type, content, icon, added_at)
                )
            conn.commit()
            return {"saved": True, "summary": summary}
        finally:
            conn.close()
