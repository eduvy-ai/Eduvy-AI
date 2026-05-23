from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependency import get_current_active_user, get_current_admin_user
from app.modules.users.schema import UserCreate, UserUpdate, UserResponse, UsersListResponse
from app.modules.users.service import (
    get_all_users,
    get_user,
    create_new_user,
    update_existing_user,
    delete_existing_user,
)

router = APIRouter()


@router.get("", response_model=UsersListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Get all users (admin only)."""
    return await get_all_users(db, page, page_size)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """Get user by ID."""
    return await get_user(db, user_id)


@router.post("", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Create a new user (admin only)."""
    return await create_new_user(db, user_data)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """Update user."""
    return await update_existing_user(db, user_id, user_data)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Delete user (admin only)."""
    await delete_existing_user(db, user_id, current_user.id)
    return {"message": "User deleted successfully"}
