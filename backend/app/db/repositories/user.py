"""
User Repository - All user-related database queries.
"""
import uuid
from typing import Dict, List, Optional, Any
from app.db.repositories.base import BaseRepository
from app.db.connection import get_db, row_to_dict


class UserRepository(BaseRepository):
    table_name = "users"
    
    # ── Custom User Queries ───────────────────────────────────
    
    def get_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email address."""
        return self.find_one({"email": email.lower().strip()})
    
    def create_user(
        self,
        email: str,
        password_hash: str,
        name: str,
        **kwargs
    ) -> Dict:
        """Create a new user with required fields."""
        data = {
            "id": str(uuid.uuid4()),
            "email": email.lower().strip(),
            "password_hash": password_hash,
            "name": name,
            **kwargs
        }
        return self.create(data)
    
    def add_xp(self, user_id: str, points: int) -> int:
        """Add XP to user. Returns new XP total."""
        return self.increment(user_id, "xp", points)
    
    def update_streak(self, user_id: str, streak: int, last_active: str = None) -> Optional[Dict]:
        """Update user streak."""
        data = {"streak": streak}
        if last_active:
            data["last_active"] = last_active
        return self.update(user_id, data)
    
    def get_leaderboard(self, standard: str = None, limit: int = 10) -> List[Dict]:
        """Get top users by XP."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            query = "SELECT id, name, xp, streak, school FROM users WHERE is_admin = FALSE"
            params = []
            
            if standard:
                query += " AND standard = %s"
                params.append(standard)
            
            query += " ORDER BY xp DESC LIMIT %s"
            params.append(limit)
            
            cur.execute(query, params)
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def search(self, term: str, limit: int = 20) -> List[Dict]:
        """Search users by name or email."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT id, name, email, standard, school 
                   FROM users 
                   WHERE name ILIKE %s OR email ILIKE %s
                   ORDER BY name
                   LIMIT %s""",
                (f"%{term}%", f"%{term}%", limit)
            )
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def get_by_plan(self, plan: str) -> List[Dict]:
        """Get all users with a specific plan."""
        return self.find({"plan": plan})
    
    def update_plan(self, user_id: str, plan: str, expires_at: str = None) -> Optional[Dict]:
        """Update user's subscription plan."""
        data = {"plan": plan}
        if expires_at:
            data["plan_expires_at"] = expires_at
        return self.update(user_id, data)
