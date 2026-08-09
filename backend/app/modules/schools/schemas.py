"""
Schools Schemas - Request/Response models.
"""
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# ── School CRUD ───────────────────────────────────────────────

class SchoolCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    logo_url: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    plan: str = "pilot"  # pilot | school_basic | school_pro
    student_limit: int = 100


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    plan: Optional[str] = None
    student_limit: Optional[int] = None
    is_active: Optional[bool] = None


class SchoolResponse(BaseModel):
    id: int
    name: str
    logo_url: str
    contact_email: str
    contact_phone: str
    address: str
    city: str
    state: str
    plan: str
    student_limit: int
    plan_expires_at: str
    school_code: str
    admin_user_id: str
    is_active: bool
    student_count: int = 0
    created_at: str


class SchoolListResponse(BaseModel):
    schools: List[SchoolResponse]
    total: int


# ── Student Import ────────────────────────────────────────────

class StudentImportRow(BaseModel):
    name: str
    email: str = ""
    mobile: str = ""
    standard: str = "Class 10"
    board: str = "CBSE"
    medium: str = "English"


class StudentImportRequest(BaseModel):
    students: List[StudentImportRow]


class StudentImportResult(BaseModel):
    created: int
    skipped: int
    errors: List[str]


# ── School Join ───────────────────────────────────────────────

class JoinSchoolRequest(BaseModel):
    school_code: str = Field(..., min_length=6, max_length=10)


class JoinSchoolResponse(BaseModel):
    success: bool
    school_name: str
    message: str


# ── School Analytics ──────────────────────────────────────────

class SchoolAnalytics(BaseModel):
    total_students: int
    active_students_7d: int
    total_ai_calls: int
    total_battles: int
    total_study_minutes: int
    avg_mastery: float
    top_students: List[dict]


# ── School Billing ────────────────────────────────────────────

class SchoolUpgradeRequest(BaseModel):
    plan: str = Field(..., pattern="^(school_basic|school_pro)$")


class SchoolPlanResponse(BaseModel):
    plan: str
    amount_paise: int
    amount_rupees: int
    duration_days: int
    student_limit: int
