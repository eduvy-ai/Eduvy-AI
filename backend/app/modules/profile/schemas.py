"""
Profile Schemas - Request/Response validation models.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ProfileCreate(BaseModel):
    id: str
    name: str
    mobile: Optional[str] = ""
    parent_mobile: Optional[str] = ""
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    subjects: List[str] = []


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    parent_mobile: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    language: Optional[str] = None
    display_language: Optional[str] = Field(default=None, alias="displayLanguage")
    subjects: Optional[List[str]] = None
    school: Optional[str] = None
    avatar_url: Optional[str] = Field(default=None, alias="avatarUrl")

    class Config:
        populate_by_name = True


class XpRequest(BaseModel):
    points: int = Field(ge=0, le=1000)


class StreakRequest(BaseModel):
    streak: int = Field(ge=0, le=36500)


class AIConfigRequest(BaseModel):
    provider: str
    model: str
    apiKey: Optional[str] = ""
    aiKeys: Optional[dict] = None
