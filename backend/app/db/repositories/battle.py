"""
Battle Repository - Muqabla battle database queries.
"""
from typing import Dict, List, Optional
from app.db.repositories.base import BaseRepository
from app.db.connection import get_db, row_to_dict


class BattleRepository(BaseRepository):
    table_name = "muqabla_battles"
    
    def get_open_battles(self, standard: str, exclude_user: str = None) -> List[Dict]:
        """Get open battles available to join."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            query = """
                SELECT * FROM muqabla_battles
                WHERE status = 'open' 
                AND standard = %s
                AND expires_at > CURRENT_TIMESTAMP
            """
            params = [standard]
            
            if exclude_user:
                query += " AND challenger_id != %s"
                params.append(exclude_user)
            
            query += " ORDER BY created_at DESC LIMIT 20"
            
            cur.execute(query, params)
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def join_battle(self, battle_id: int, user_id: str, name: str, school: str) -> Optional[Dict]:
        """Join an open battle as opponent."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE muqabla_battles
                SET opponent_id = %s, opponent_name = %s, opponent_school = %s, status = 'active'
                WHERE id = %s AND status = 'open' AND opponent_id IS NULL
                RETURNING *
            """, (user_id, name, school, battle_id))
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    def submit_answer(
        self,
        battle_id: int,
        user_id: str,
        score: int,
        answers: str,
        time_taken: int
    ) -> Optional[Dict]:
        """Submit answers for a battle."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check if user is challenger or opponent
            cur.execute("SELECT challenger_id, opponent_id FROM muqabla_battles WHERE id = %s", (battle_id,))
            battle = cur.fetchone()
            if not battle:
                return None
            
            if battle["challenger_id"] == user_id:
                cur.execute("""
                    UPDATE muqabla_battles
                    SET challenger_score = %s, challenger_answers = %s, challenger_time = %s
                    WHERE id = %s
                    RETURNING *
                """, (score, answers, time_taken, battle_id))
            elif battle["opponent_id"] == user_id:
                cur.execute("""
                    UPDATE muqabla_battles
                    SET opponent_score = %s, opponent_answers = %s, opponent_time = %s
                    WHERE id = %s
                    RETURNING *
                """, (score, answers, time_taken, battle_id))
            else:
                return None
            
            conn.commit()
            return row_to_dict(cur.fetchone())
        finally:
            conn.close()
    
    def get_user_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get battle history for a user."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT * FROM muqabla_battles
                WHERE (challenger_id = %s OR opponent_id = %s)
                AND status = 'completed'
                ORDER BY completed_at DESC
                LIMIT %s
            """, (user_id, user_id, limit))
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def get_leaderboard(self, standard: str = None, limit: int = 10) -> List[Dict]:
        """Get battle leaderboard (wins count)."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            query = """
                SELECT winner_id, COUNT(*) as wins
                FROM muqabla_battles
                WHERE status = 'completed' AND winner_id IS NOT NULL
            """
            params = []
            
            if standard:
                query += " AND standard = %s"
                params.append(standard)
            
            query += """
                GROUP BY winner_id
                ORDER BY wins DESC
                LIMIT %s
            """
            params.append(limit)
            
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
