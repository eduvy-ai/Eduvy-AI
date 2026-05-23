from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.modules.users.query import (
    get_users as query_get_users,
    get_user_by_id as query_get_user_by_id,
    get_user_by_email as query_get_user_by_email,
    create_user as query_create_user,
    update_user as query_update_user,
    delete_user as query_delete_user,
)
from app.modules.users.schema import UserCreate, UserUpdate, UserResponse, UsersListResponse
from app.modules.users.exceptions import UserNotFoundException, UserExistsException, CannotDeleteSelfException


async def get_all_users(db: AsyncSession, page: int = 1, page_size: int = 10) -> UsersListResponse:
    """Get all users with pagination."""
    skip = (page - 1) * page_size
    users, total = await query_get_users(db, skip=skip, limit=page_size)
    
    return UsersListResponse(
        data=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_user(db: AsyncSession, user_id: str) -> UserResponse:
    """Get user by ID."""
    user = await query_get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException(user_id)
    return UserResponse.model_validate(user)


async def create_new_user(db: AsyncSession, user_data: UserCreate) -> UserResponse:
    """Create a new user."""
    existing = await query_get_user_by_email(db, user_data.email)
    if existing:
        raise UserExistsException(user_data.email)
    
    user = await query_create_user(db, user_data)
    return UserResponse.model_validate(user)


async def update_existing_user(db: AsyncSession, user_id: str, user_data: UserUpdate) -> UserResponse:
    """Update an existing user."""
    user = await query_get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException(user_id)
    
    # Check if email is being changed and if it's already taken
    if user_data.email and user_data.email != user.email:
        existing = await query_get_user_by_email(db, user_data.email)
        if existing:
            raise UserExistsException(user_data.email)
    
    updated_user = await query_update_user(db, user, user_data)
    return UserResponse.model_validate(updated_user)


async def delete_existing_user(db: AsyncSession, user_id: str, current_user_id: str) -> None:
    """Delete an existing user."""
    if user_id == current_user_id:
        raise CannotDeleteSelfException()
    
    user = await query_get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException(user_id)
    
    await query_delete_user(db, user)
