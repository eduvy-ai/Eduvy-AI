"""
Squad Repository - All squad-related database queries.
"""
from typing import Dict, List, Optional
from app.db.repositories.base import BaseRepository
from app.db.connection import get_db, row_to_dict


class SquadRepository(BaseRepository):
    table_name = "squads"
    
    def find_for_user(self, standard: str, medium: str) -> Optional[Dict]:
        """Find a squad matching user's standard and medium."""
        return self.find_one({
            "standard": standard,
            "medium": medium,
            "is_active": True
        })
    
    def get_members(self, squad_id: int) -> List[Dict]:
        """Get all members of a squad with user details."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT sm.user_id, sm.role, sm.joined_at, 
                       u.name, u.xp, u.streak, u.school
                FROM squad_members sm
                JOIN users u ON sm.user_id = u.id
                WHERE sm.squad_id = %s
                ORDER BY sm.joined_at
            """, (squad_id,))
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def add_member(self, squad_id: int, user_id: str, role: str = "learner") -> bool:
        """Add a member to squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO squad_members (squad_id, user_id, role)
                VALUES (%s, %s, %s)
                ON CONFLICT (squad_id, user_id) DO NOTHING
            """, (squad_id, user_id, role))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()
    
    def remove_member(self, squad_id: int, user_id: str) -> bool:
        """Remove a member from squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM squad_members WHERE squad_id = %s AND user_id = %s",
                (squad_id, user_id)
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()
    
    def get_messages(self, squad_id: int, limit: int = 50) -> List[Dict]:
        """Get recent messages from squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT id, user_id, display_name, content, msg_type, created_at
                FROM squad_messages
                WHERE squad_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (squad_id, limit))
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def add_message(
        self,
        squad_id: int,
        user_id: str,
        display_name: str,
        content: str,
        msg_type: str = "chat"
    ) -> Dict:
        """Add a message to squad chat."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO squad_messages (squad_id, user_id, display_name, content, msg_type)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
            """, (squad_id, user_id, display_name, content, msg_type))
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    def is_member(self, squad_id: int, user_id: str) -> bool:
        """Check if user is a member of squad."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM squad_members WHERE squad_id = %s AND user_id = %s",
                (squad_id, user_id)
            )
            return cur.fetchone() is not None
        finally:
            conn.close()
