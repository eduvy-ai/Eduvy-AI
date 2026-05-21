"""
referrals.py — Referral code system.

GET  /api/referrals/code        → return (or generate) the user's referral code + stats
POST /api/referrals/apply       → apply a referral code (once, within 30 days of account creation)
"""
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database import get_db, row_to_dict
from routers.auth import get_current_user

router = APIRouter()

# XP rewards
_REFERRER_XP = 500   # person whose code was used
_REFERRED_XP = 200   # new user who applied the code

_CODE_CHARS = string.ascii_uppercase + string.digits
_CODE_LEN   = 7


def _generate_code(conn) -> str:
    """Generate a unique 7-char alphanumeric code."""
    cur = conn.cursor()
    for _ in range(20):
        code = ''.join(random.choices(_CODE_CHARS, k=_CODE_LEN))
        cur.execute("SELECT id FROM users WHERE referral_code = %s", (code,))
        if not cur.fetchone():
            return code
    raise HTTPException(status_code=500, detail="Could not generate unique referral code")


@router.get("/referrals/code")
async def get_referral_code(user_id: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT referral_code FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        row = row_to_dict(row)
        code = row.get("referral_code") or ""

        # Generate lazily if not set yet
        if not code:
            code = _generate_code(conn)
            cur.execute("UPDATE users SET referral_code = %s WHERE id = %s", (code, user_id))
            conn.commit()

        # Count successful referrals
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM users WHERE referred_by = %s",
            (user_id,),
        )
        cnt_row = cur.fetchone()
        referred_count = (row_to_dict(cnt_row) or {}).get("cnt", 0) if cnt_row else 0

        return {
            "code": code,
            "referred_count": referred_count,
            "referrer_xp_per_referral": _REFERRER_XP,
            "referred_xp_bonus": _REFERRED_XP,
        }
    finally:
        conn.close()


class ApplyCodeRequest(BaseModel):
    code: str


@router.post("/referrals/apply")
async def apply_referral_code(data: ApplyCodeRequest, user_id: str = Depends(get_current_user)):
    code = data.code.strip().upper()
    if not code:
        raise HTTPException(status_code=422, detail="Referral code required")

    conn = get_db()
    try:
        cur = conn.cursor()

        # Check the current user hasn't already used a referral code
        cur.execute("SELECT referred_by, xp, created_at FROM users WHERE id = %s", (user_id,))
        me = cur.fetchone()
        if not me:
            raise HTTPException(status_code=404, detail="User not found")
        me = row_to_dict(me)

        if me.get("referred_by"):
            raise HTTPException(status_code=409, detail="You have already applied a referral code")

        # Find the owner of this code — cannot refer yourself
        cur.execute("SELECT id, xp FROM users WHERE referral_code = %s", (code,))
        referrer_row = cur.fetchone()
        if not referrer_row:
            raise HTTPException(status_code=404, detail="Invalid referral code")
        referrer = row_to_dict(referrer_row)

        if referrer["id"] == user_id:
            raise HTTPException(status_code=400, detail="You cannot use your own referral code")

        # Apply referral — mark referred_by and award XP to both users
        cur.execute("UPDATE users SET referred_by = %s WHERE id = %s", (referrer["id"], user_id))
        cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (_REFERRED_XP, user_id))
        cur.execute("UPDATE users SET xp = xp + %s WHERE id = %s", (_REFERRER_XP, referrer["id"]))
        conn.commit()

        return {
            "success": True,
            "xp_awarded": _REFERRED_XP,
            "message": f"Referral applied! You earned {_REFERRED_XP} bonus XP.",
        }
    finally:
        conn.close()
