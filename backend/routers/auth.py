"""
auth.py — Register, Login, and token-verify endpoints.

POST /api/auth/register  → create account, return JWT + profile
POST /api/auth/login     → verify email+password, return JWT + profile
GET  /api/auth/me        → verify token, return profile (used on app load)
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
import bcrypt
import json

from database import get_db, row_to_dict

router = APIRouter()

# ── Password hashing (bcrypt direct — passlib has Python 3.14 compat issues) ──

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT helpers ─────────────────────────────────────────────────
_JWT_SECRET    = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
_JWT_DAYS      = int(os.getenv("JWT_EXPIRE_DAYS", "30"))

_bearer = HTTPBearer(auto_error=False)


def _make_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=_JWT_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def _decode_token(token: str) -> str:
    """Return user_id or raise 401."""
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return uid
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode_token(creds.credentials)


# ── Request / Response models ────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    subjects: list[str] = []
    mobile: str = ""
    parent_mobile: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


def _safe_profile(row: dict) -> dict:
    """Return profile dict without password_hash."""
    row.pop("password_hash", None)
    # Parse subjects JSON
    if isinstance(row.get("subjects"), str):
        try:
            row["subjects"] = json.loads(row["subjects"])
        except Exception:
            row["subjects"] = []
    if isinstance(row.get("ai_keys"), str):
        try:
            row["ai_keys"] = json.loads(row["ai_keys"])
        except Exception:
            row["ai_keys"] = {}
    return row


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/auth/register", status_code=201)
async def register(data: RegisterRequest):
    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Valid email required")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    if not data.name.strip():
        raise HTTPException(status_code=422, detail="Name required")

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        user_id = str(uuid.uuid4())
        pw_hash = hash_password(data.password)
        subjects_json = json.dumps(data.subjects or [])

        cur.execute(
            """INSERT INTO users
               (id, email, password_hash, name, mobile, parent_mobile,
                standard, board, language, subjects)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                user_id, email, pw_hash,
                data.name.strip(), data.mobile or "", data.parent_mobile or "",
                data.standard, data.board, data.language, subjects_json,
            ),
        )
        conn.commit()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = row_to_dict(cur.fetchone())
        token = _make_token(user_id)
        return {"token": token, "profile": _safe_profile(row)}
    finally:
        conn.close()


@router.post("/auth/login")
async def login(data: LoginRequest):
    email = data.email.strip().lower()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Email not found")
        row = row_to_dict(row)
        if not row.get("password_hash") or not verify_password(data.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect password")
        token = _make_token(row["id"])
        return {"token": token, "profile": _safe_profile(row)}
    finally:
        conn.close()


@router.get("/auth/me")
async def me(user_id: str = Depends(get_current_user)):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return _safe_profile(row_to_dict(row))
    finally:
        conn.close()
