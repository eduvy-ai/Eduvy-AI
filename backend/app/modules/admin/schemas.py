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
    stream_id: Optional[str] = None
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
    content_status: str = "draft"  # draft, review, published
    is_active: bool = True


class ChapterUpdate(BaseModel):
    chapter_name: Optional[str] = None
    chapter_name_local: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[List[str]] = None
    content_status: Optional[str] = None  # draft, review, published
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
    stream: str = ""  # Required for Class 11-12 (Science, Commerce, Arts)
    language: str = "English"
    plan: str = "free"
    send_email: bool = True  # Send welcome email with temp password


class StudentUpdate(BaseModel):
    """Update a student"""
    name: Optional[str] = None
    email: Optional[str] = None
    standard: Optional[str] = None
    board: Optional[str] = None
    stream: Optional[str] = None  # For Class 11-12
    language: Optional[str] = None
    plan: Optional[str] = None
    plan_expires_at: Optional[str] = None
    is_drishti: Optional[bool] = None
    is_suspended: Optional[bool] = None  # Suspend student access


class BulkImportStudent(BaseModel):
    """Single student for bulk import"""
    name: str
    email: str
    standard: str = "Class 10"
    board: str = "CBSE"
    stream: str = ""  # For Class 11-12 (Science, Commerce, Arts)
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


class AIKeyEnhanced(BaseModel):
    """Enhanced API key with metadata."""
    provider: str
    key: str
    slot: int = 1
    owner_email: str = ""
    project_name: str = ""
    description: str = ""
    rpm_limit: Optional[int] = None
    tpm_limit: Optional[int] = None
    daily_limit: Optional[int] = None


class AIKeyValidate(BaseModel):
    """Request to validate an API key."""
    provider: str
    key: str


class AIKeyToggle(BaseModel):
    """Enable/disable a key."""
    enabled: bool


class AIKeyMetadataUpdate(BaseModel):
    """Update key metadata only (without changing the key)."""
    owner_email: Optional[str] = None
    project_name: Optional[str] = None
    description: Optional[str] = None
    rpm_limit: Optional[int] = None
    tpm_limit: Optional[int] = None
    daily_limit: Optional[int] = None


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


class AccountRequestReview(BaseModel):
    status: str  # in_review | approved | rejected
    review_notes: str = ""
    create_account: bool = False


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


# ── AI Prompts ───────────────────────────────────────────────

class AIPromptCreate(BaseModel):
    """Create a new AI prompt."""
    key: str
    name: str
    description: str = ""
    category: str = "system"  # tutor, quiz, grading, summary, chat, system
    template: str
    variables: List[str] = []
    model: str = "gpt-4o-mini"
    max_tokens: int = 1024
    temperature: float = 0.7
    is_active: bool = True


class AIPromptUpdate(BaseModel):
    """Update an AI prompt."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    template: Optional[str] = None
    variables: Optional[List[str]] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    is_active: Optional[bool] = None


class AIPromptSeed(BaseModel):
    """Request to seed prompts from hardcoded values."""
    overwrite: bool = False  # If True, overwrites existing prompts
