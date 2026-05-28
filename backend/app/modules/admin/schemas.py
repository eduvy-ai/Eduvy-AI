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


class CurriculumImport(BaseModel):
    rows: List[CurriculumRow]


class UserPlanUpdate(BaseModel):
    plan: str
    plan_expires_at: Optional[str] = None


class UserAIConfig(BaseModel):
    provider: str
    model: str
    override: bool = True


class CreateDrishtiStudent(BaseModel):
    name: str
    email: str
    password: str
    standard: str
    board: str
    language: str = "English"
    is_drishti: bool = True


class AIRoutingUpdate(BaseModel):
    plan: str
    provider: str
    model: str


class AIKeyUpsert(BaseModel):
    provider: str
    key: str
    slot: int = 1


class HelperCreate(BaseModel):
    helper_name: str
    helper_email: str
    helper_type: str = "teacher"
    notes: str = ""


class HelperUpdate(BaseModel):
    helper_name: str
    helper_email: str
    helper_type: str = "teacher"
    notes: str = ""


class BulkDeleteStr(BaseModel):
    ids: List[str]


class BulkDeleteInt(BaseModel):
    ids: List[int]
