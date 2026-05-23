from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependency import get_current_active_user
from app.modules.auth.schema import UserLogin, UserCreate, AuthResponse, UserResponse
from app.modules.auth.service import authenticate_user, register_user, get_current_user_profile

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access token."""
    return await authenticate_user(db, credentials)


@router.post("/register", response_model=AuthResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    return await register_user(db, user_data)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_active_user)):
    """Get current user profile."""
    return await get_current_user_profile(current_user)


@router.post("/logout")
async def logout():
    """Logout user (client should discard token)."""
    return {"message": "Logged out successfully"}
