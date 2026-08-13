"""
FastAPI dependencies for injection.
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.core.security import decode_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    """
    Dependency to get current authenticated user ID from JWT token.
    Raises 401 if not authenticated or token invalid.
    """
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        return decode_token(creds.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


def get_optional_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str | None:
    """Returns user_id if authenticated, None otherwise."""
    if not creds:
        return None
    try:
        return decode_token(creds.credentials)
    except (JWTError, Exception):
        return None


def require_admin(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    """
    Dependency to require admin role from JWT token.
    Validates the token contains role=admin claim.
    """
    if not creds:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        from app.core.security import decode_token
        import os
        from jose import jwt as jose_jwt
        secret = os.getenv("JWT_SECRET", "eduvyai-change-me")
        algo = os.getenv("JWT_ALGORITHM", "HS256")
        payload = jose_jwt.decode(creds.credentials, secret, algorithms=[algo])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access only")
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return uid
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
