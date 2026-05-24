"""
Squads Service - Business logic for study squads.
"""
import random
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.db import db
from app.db.connection import get_db, row_to_dict

SQUAD_MAX_SIZE = 4
TEACHING_XP_REWARD = 50

# Concept banks for challenges
_CONCEPTS = {
    "Mathematics":  ["Quadratic Equations", "Trigonometry", "Polynomials", "Coordinate Geometry"],
    "Science":      ["Laws of Motion", "Electricity", "Chemical Reactions", "Life Processes"],
    "Physics":      ["Newton's Laws", "Optics", "Current Electricity", "Gravitation"],
    "Chemistry":    ["Acids & Bases", "Carbon Compounds", "Periodic Table"],
    "Biology":      ["Photosynthesis", "Human Digestive System", "DNA & Heredity"],
    "English":      ["Tense Forms", "Passive Voice", "Essay Structure"],
}
_DEFAULT_CONCEPTS = ["Key Concepts", "Core Principles", "Important Definitions"]


class SquadService:
    """Squad business logic."""
    
    @staticmethod
    def get_user_squad(user_id: str) -> Optional[Dict]:
        """Get user's current active squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.id, s.name, s.focus_subject, s.created_at::text AS created_at
                FROM squads s
                JOIN squad_members sm ON sm.squad_id = s.id
                WHERE sm.user_id = %s AND s.is_active = TRUE
                ORDER BY sm.joined_at DESC LIMIT 1
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            
            squad = dict(row)
            sid = squad["id"]
            
            # Get members
            cur.execute("""
                SELECT sm.user_id, sm.role, sm.last_seen_at::text AS last_seen_at,
                       u.name, u.standard
                FROM squad_members sm
                JOIN users u ON u.id = sm.user_id
                WHERE sm.squad_id = %s
            """, (sid,))
            squad["members"] = [dict(r) for r in cur.fetchall()]
            
            # Message count
            cur.execute("SELECT COUNT(*) AS cnt FROM squad_messages WHERE squad_id = %s", (sid,))
            squad["message_count"] = cur.fetchone()["cnt"]
            
            return squad
        finally:
            conn.close()
    
    @staticmethod
    def require_member(squad_id: int, user_id: str):
        """Raise 403 if user is not a member of the squad."""
        if not db.squads.is_member(squad_id, user_id):
            raise HTTPException(status_code=403, detail="Not a member of this squad")
    
    @staticmethod
    def match_into_squad(user_id: str) -> Dict:
        """Match user into an existing or new squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get user info
            cur.execute("SELECT name, standard, language FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            standard = user["standard"]
            medium = user["language"]
            name = user["name"]
            
            # Check if already in a squad
            existing = SquadService.get_user_squad(user_id)
            if existing:
                return existing
            
            # Find matching squad with space
            cur.execute("""
                SELECT id, name, focus_subject, member_count
                FROM (
                    SELECT s.id, s.name, s.focus_subject,
                           (SELECT COUNT(*) FROM squad_members WHERE squad_id = s.id) AS member_count
                    FROM squads s
                    WHERE s.standard = %s AND s.medium = %s AND s.is_active = TRUE
                ) AS sq
                WHERE member_count < %s
                ORDER BY member_count DESC
                LIMIT 1
            """, (standard, medium, SQUAD_MAX_SIZE))
            squad = cur.fetchone()
            
            if squad:
                # Join existing squad
                squad_id = squad["id"]
            else:
                # Create new squad
                cur.execute("""
                    INSERT INTO squads (name, focus_subject, standard, medium)
                    VALUES (%s, 'General', %s, %s)
                    RETURNING id
                """, (f"Study Squad {standard}", standard, medium))
                squad_id = cur.fetchone()["id"]
            
            # Add member
            cur.execute("""
                INSERT INTO squad_members (squad_id, user_id, role)
                VALUES (%s, %s, 'learner')
                ON CONFLICT DO NOTHING
            """, (squad_id, user_id))
            
            # System message
            cur.execute("""
                INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)
                VALUES (%s, %s, 'System', %s, 'system')
            """, (squad_id, user_id, f"{name} joined the squad!"))
            
            conn.commit()
            
            return SquadService.get_user_squad(user_id)
        finally:
            conn.close()
    
    @staticmethod
    def get_messages(squad_id: int, since_id: int = 0, limit: int = 50) -> List[Dict]:
        """Get messages from squad since a specific ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, display_name, content, msg_type,
                       created_at::text AS created_at
                FROM squad_messages
                WHERE squad_id = %s AND id > %s
                ORDER BY id ASC
                LIMIT %s
            """, (squad_id, since_id, limit))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def send_message(
        squad_id: int,
        user_id: str,
        content: str,
        display_name: str = "Student",
        msg_type: str = "chat"
    ) -> Dict:
        """Send a message to squad chat."""
        if not content.strip():
            raise HTTPException(status_code=400, detail="Message content required")
        if len(content) > 2000:
            raise HTTPException(status_code=400, detail="Message too long")
        
        return db.squads.add_message(squad_id, user_id, display_name, content, msg_type)
    
    @staticmethod
    def leave_squad(squad_id: int, user_id: str) -> Dict:
        """Leave a squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Get user name for system message
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            name = user["name"] if user else "Student"
            
            # Remove member
            cur.execute(
                "DELETE FROM squad_members WHERE squad_id = %s AND user_id = %s",
                (squad_id, user_id)
            )
            
            if cur.rowcount > 0:
                # System message
                cur.execute("""
                    INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)
                    VALUES (%s, %s, 'System', %s, 'system')
                """, (squad_id, user_id, f"{name} left the squad"))
                conn.commit()
            
            return {"left": True}
        finally:
            conn.close()
