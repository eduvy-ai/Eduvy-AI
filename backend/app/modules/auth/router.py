"""
Auth Router - API endpoints only.
NO business logic, NO database code.
"""
import asyncio
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.modules.auth.schemas import RegisterRequest, LoginRequest
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=201)
async def register(data: RegisterRequest):
    """Register a new user account."""
    return await asyncio.to_thread(
        AuthService.register,
        email=data.email,
        password=data.password,
        name=data.name,
        standard=data.standard,
        board=data.board,
        language=data.language,
        subjects=data.subjects,
        mobile=data.mobile,
        parent_mobile=data.parent_mobile,
    )


@router.post("/login")
async def login(data: LoginRequest):
    """Login with email and password."""
    return await asyncio.to_thread(
        AuthService.login,
        email=data.email,
        password=data.password,
    )


@router.get("/me")
async def me(user_id: str = Depends(get_current_user)):
    """Get current user profile."""
    return await asyncio.to_thread(AuthService.get_profile, user_id)
