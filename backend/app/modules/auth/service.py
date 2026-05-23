from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.query import get_user_by_email, create_user
from app.modules.auth.schema import UserLogin, UserCreate, AuthResponse, UserResponse
from app.modules.auth.exceptions import InvalidCredentialsException, UserExistsException, InactiveUserException
from app.core.security import verify_password, create_access_token, create_refresh_token


async def authenticate_user(db: AsyncSession, credentials: UserLogin) -> AuthResponse:
    """Authenticate user and return tokens."""
    user = await get_user_by_email(db, credentials.email)
    
    if not user:
        raise InvalidCredentialsException()
    
    if not verify_password(credentials.password, user.hashed_password):
        raise InvalidCredentialsException()
    
    if not user.is_active:
        raise InactiveUserException()
    
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return AuthResponse(
        user=UserResponse.model_validate(user),
        token=access_token,
        refresh_token=refresh_token,
    )


async def register_user(db: AsyncSession, user_data: UserCreate) -> AuthResponse:
    """Register a new user."""
    existing_user = await get_user_by_email(db, user_data.email)
    
    if existing_user:
        raise UserExistsException()
    
    user = await create_user(
        db,
        email=user_data.email,
        password=user_data.password,
        name=user_data.name,
        role=user_data.role,
    )
    
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return AuthResponse(
        user=UserResponse.model_validate(user),
        token=access_token,
        refresh_token=refresh_token,
    )


async def get_current_user_profile(user) -> UserResponse:
    """Get current user profile."""
    return UserResponse.model_validate(user)
