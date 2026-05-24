"""
Security utilities: JWT tokens and password hashing.
"""
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import bcrypt

from app.core.config import settings


# ── Password Hashing ──────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT Tokens ────────────────────────────────────────────────

def create_token(user_id: str) -> str:
    """Create a JWT token for the given user ID."""
    exp = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "exp": exp},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> str:
    """
    Decode a JWT token and return the user ID.
    Raises JWTError if token is invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM]
    )
    user_id = payload.get("sub")
    if not user_id:
        raise JWTError("Invalid token: missing user ID")
    return user_id
