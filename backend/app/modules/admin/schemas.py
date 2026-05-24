"""
Admin Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import List, Optional


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminSetupRequest(BaseModel):
    email: str
    password: str
    name: str = "SuperAdmin"


class BoardUpsert(BaseModel):
    id: str
    name: str
    sort_order: int = 0
    is_active: bool = True


class StandardUpsert(BaseModel):
    id: str
    name: str
    grade_num: int
    sort_order: int = 0
    is_active: bool = True


class MediumUpsert(BaseModel):
    id: str
    name: str
    sort_order: int = 0
    is_active: bool = True


class CurriculumRow(BaseModel):
    board_id: str
    standard_id: str
    medium_id: str
    subjects: List[str]
    is_active: bool = True


class CurriculumUpdate(BaseModel):
    subjects: Optional[List[str]] = None
    is_active: Optional[bool] = None
