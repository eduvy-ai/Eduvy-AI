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


def require_admin(current_user: str = Depends(get_current_user)) -> str:
    """
    Dependency to require admin role.
    For now just returns user, add admin check logic when needed.
    """
    # TODO: Check if user is admin in database
    return current_user
