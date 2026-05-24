"""
Referrals Service - Business logic for referral system.
"""
import random
import string
from typing import Dict
from fastapi import HTTPException

from app.db.connection import get_db, row_to_dict

_REFERRER_XP = 500
_REFERRED_XP = 200
_CODE_CHARS = string.ascii_uppercase + string.digits
_CODE_LEN = 7


def _generate_code(conn) -> str:
    """Generate a unique referral code."""
    cur = conn.cursor()
    for _ in range(20):
        code = ''.join(random.choices(_CODE_CHARS, k=_CODE_LEN))
        cur.execute("SELECT id FROM users WHERE referral_code = %s", (code,))
        if not cur.fetchone():
            return code
    raise HTTPException(status_code=500, detail="Could not generate unique referral code")


class ReferralsService:
    """Referrals business logic."""
    
    @staticmethod
    def get_referral_code(user_id: str) -> Dict:
        """Get or generate referral code for user."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT referral_code FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            code = row["referral_code"] or ""
            
            # Generate if not set
            if not code:
                code = _generate_code(conn)
                cur.execute("UPDATE users SET referral_code = %s WHERE id = %s", (code, user_id))
                conn.commit()
            
            # Count referrals
            cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE referred_by = %s", (user_id,))
            cnt_row = cur.fetchone()
            referred_count = cnt_row["cnt"] if cnt_row else 0
            
            return {
                "code": code,
                "referred_count": referred_count,
                "referrer_xp_per_referral": _REFERRER_XP,
                "referred_xp_bonus": _REFERRED_XP,
            }
        finally:
            conn.close()
    
    @staticmethod
    def apply_referral_code(user_id: str, code: str) -> Dict:
        """Apply a referral code."""
        code = code.strip().upper()
        if not code:
            raise HTTPException(status_code=422, detail="Referral code required")
        
        conn = get_db()
        try:
            cur = conn.cursor()
            
            # Check user hasn't already used a code
            cur.execute("SELECT referred_by, xp FROM users WHERE id = %s", (user_id,))
            me = cur.fetchone()
            if not me:
                raise HTTPException(status_code=404, detail="User not found")
            
            if me["referred_by"]:
                raise HTTPException(status_code=409, detail="You have already applied a referral code")
            
            # Find code owner
            cur.execute("SELECT id, xp FROM users WHERE referral_code = %s", (code,))
            referrer = cur.fetchone()
            if not referrer:
                raise HTTPException(status_code=404, detail="Invalid referral code")
            
            if referrer["id"] == user_id:
                raise HTTPException(status_code=400, detail="Cannot use your own referral code")
            
            # Apply referral
            cur.execute(
                "UPDATE users SET referred_by = %s, xp = xp + %s WHERE id = %s",
                (referrer["id"], _REFERRED_XP, user_id)
            )
            cur.execute(
                "UPDATE users SET xp = xp + %s WHERE id = %s",
                (_REFERRER_XP, referrer["id"])
            )
            conn.commit()
            
            return {
                "success": True,
                "xp_earned": _REFERRED_XP,
                "message": f"Referral applied! You earned {_REFERRED_XP} XP."
            }
        finally:
            conn.close()
