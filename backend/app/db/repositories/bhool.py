"""
Bhool Repository - Bhool Bazaar database queries.
"""
import uuid
from typing import Dict, List, Optional
from app.db.repositories.base import BaseRepository
from app.db.connection import get_db, row_to_dict


class BhoolRepository(BaseRepository):
    table_name = "bhool_cards"
    
    def create_card(
        self,
        user_id: str,
        question: str,
        wrong_answer: str,
        correct_answer: str,
        why_wrong: str = "",
        subject: str = "General",
        standard: str = "Class 10",
        is_published: bool = True
    ) -> Dict:
        """Create a new bhool card."""
        return self.create({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "question": question,
            "wrong_answer": wrong_answer,
            "correct_answer": correct_answer,
            "why_wrong": why_wrong,
            "subject": subject,
            "standard": standard,
            "is_published": is_published,
            "bhool_coins": 5 if is_published else 0
        })
    
    def get_public_cards(self, subject: str = None, limit: int = 50) -> List[Dict]:
        """Get public bhool cards for marketplace."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            query = "SELECT * FROM bhool_cards WHERE is_published = TRUE"
            params = []
            
            if subject:
                query += " AND subject = %s"
                params.append(subject)
            
            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)
            
            cur.execute(query, params)
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def get_user_cards(self, user_id: str) -> List[Dict]:
        """Get all cards created by a user."""
        return self.find({"user_id": user_id}, order_by="created_at", order="desc")
    
    def collect_card(self, user_id: str, card_id: str) -> bool:
        """Collect a card to user's collection."""
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Add to collection
            cur.execute("""
                INSERT INTO bhool_collections (user_id, card_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, card_id) DO NOTHING
            """, (user_id, card_id))
            
            if cur.rowcount > 0:
                # Award bhool coins to card owner
                cur.execute(
                    "UPDATE bhool_cards SET bhool_coins = bhool_coins + 3 WHERE id = %s",
                    (card_id,)
                )
            
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()
    
    def get_collected_cards(self, user_id: str) -> List[Dict]:
        """Get cards collected by user."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT bc.* FROM bhool_cards bc
                JOIN bhool_collections bco ON bc.id = bco.card_id
                WHERE bco.user_id = %s
                ORDER BY bco.collected_at DESC
            """, (user_id,))
            return [row_to_dict(row) for row in cur.fetchall()]
        finally:
            conn.close()
    
    def has_collected(self, user_id: str, card_id: str) -> bool:
        """Check if user has collected a specific card."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM bhool_collections WHERE user_id = %s AND card_id = %s",
                (user_id, card_id)
            )
            return cur.fetchone() is not None
        finally:
            conn.close()
