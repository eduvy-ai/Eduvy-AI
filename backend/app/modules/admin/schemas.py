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


class ChangePasswordRequest(BaseModel):
    new_password: str


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


class SubjectUpsert(BaseModel):
    id: str
    name: str
    board_id: str
    standard_id: str
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


class ChapterCreate(BaseModel):
    board_id: str
    standard_id: str
    subject_id: str
    chapter_number: int
    chapter_name: str
    chapter_name_local: str = ""
    description: str = ""
    topics: List[str] = []
    is_active: bool = True


class ChapterUpdate(BaseModel):
    chapter_name: Optional[str] = None
    chapter_name_local: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ChapterBulkCreate(BaseModel):
    chapters: List[ChapterCreate]


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


class StudentCreate(BaseModel):
    """Create a student (for school admins)"""
    name: str
    email: str
    password: str = ""
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    plan: str = "free"


class StudentUpdate(BaseModel):
    """Update a student"""
    name: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    language: Optional[str] = None
    plan: Optional[str] = None
    plan_expires_at: Optional[str] = None


class BulkImportStudent(BaseModel):
    """Single student for bulk import"""
    name: str
    email: str
    standard: str = "Class 10"
    board: str = "CBSE"
    language: str = "English"
    plan: str = "free"


class BulkImportRequest(BaseModel):
    """Bulk import students request"""
    students: List[BulkImportStudent]
    send_email: bool = True  # Whether to send welcome email


class BulkImportResult(BaseModel):
    """Result of bulk import"""
    success: int = 0
    failed: int = 0
    errors: List[dict] = []
    created_students: List[dict] = []


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


# ── Community / Squads ────────────────────────────────────────

class SquadCreate(BaseModel):
    name: str
    focus_subject: str = "General"
    standard: str = "Class 10"
    medium: str = "English"


class SquadUpdate(BaseModel):
    name: Optional[str] = None
    focus_subject: Optional[str] = None
    standard: Optional[str] = None
    medium: Optional[str] = None
    is_active: Optional[bool] = None


# ── School Teachers (B2B) ────────────────────────────────────

class SchoolTeacherCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    subjects: List[str] = []
    standards: List[str] = []
    notes: str = ""


class SchoolTeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    subjects: Optional[List[str]] = None
    standards: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


# ── Questions (B2B) ──────────────────────────────────────────

class QuestionCreate(BaseModel):
    chapter_id: int
    type: str = "mcq"
    difficulty: str = "medium"
    question: str
    options: List[str] = []
    correct_answer: str
    explanation: str = ""
    tags: List[str] = []


class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    difficulty: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class QuestionBulkCreate(BaseModel):
    questions: List[QuestionCreate]


# ── Media (B2B) ──────────────────────────────────────────────

class MediaCreate(BaseModel):
    name: str
    type: str = "image"
    url: str
    thumbnail_url: str = ""
    size_bytes: int = 0
    duration_sec: Optional[int] = None
    dimensions: str = ""
    subject_id: str = ""
    chapter_id: Optional[int] = None


class MediaUpdate(BaseModel):
    name: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[int] = None
    is_active: Optional[bool] = None
