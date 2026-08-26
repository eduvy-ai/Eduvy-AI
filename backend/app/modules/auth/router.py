"""
Auth Router - API endpoints only.
NO business logic, NO database code.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.modules.auth.schemas import RegisterRequest, LoginRequest, ChangePasswordRequest, AccountRequestCreate
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=201)
async def register(data: RegisterRequest):
    """Legacy registration endpoint is disabled in favor of account requests."""
    raise HTTPException(
        status_code=410,
        detail="Direct signup is disabled. Please submit an account request.",
    )


@router.post("/account-request", status_code=201)
async def create_account_request(data: AccountRequestCreate):
    """Submit a public account request for superadmin review."""
    return await asyncio.to_thread(AuthService.create_account_request, data.model_dump())


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


@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, user_id: str = Depends(get_current_user)):
    """Change password. Used for first-login OTP flow to set new password."""
    return await asyncio.to_thread(
        AuthService.change_password,
        user_id=user_id,
        new_password=data.new_password,
        clear_must_change=True,
    )
