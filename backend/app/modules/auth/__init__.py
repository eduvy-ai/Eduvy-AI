# Auth Module
# Note: Import router directly in main.py to avoid circular imports
from app.modules.auth.schema import UserLogin, UserCreate, AuthResponse, UserResponse
from app.modules.auth.service import authenticate_user, register_user
