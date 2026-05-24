"""
Auth Schemas - Request/Response validation models.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    subjects: List[str] = []
    mobile: str = ""
    parent_mobile: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    profile: dict


class ProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    standard: str
    board: str
    language: str
    displayLanguage: str = "medium"
    subjects: List[str] = []
    xp: int = 0
    streak: int = 0
    plan: str = "free"
    school: Optional[str] = ""
