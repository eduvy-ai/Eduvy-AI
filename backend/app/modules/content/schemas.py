"""
Content Studio Schemas - Pydantic models for questions, media, and assessments.
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ── Question Types ──────────────────────────────────────────────

QuestionType = Literal['mcq', 'true_false', 'fill_blank', 'short_answer', 'long_answer']
Difficulty = Literal['easy', 'medium', 'hard']


class QuestionBase(BaseModel):
    """Base question fields."""
    chapter_id: int = Field(..., description="FK to chapters.id")
    type: QuestionType = Field(..., description="Question type")
    difficulty: Difficulty = Field('medium', description="Difficulty level")
    question: str = Field(..., min_length=5, max_length=2000, description="Question text")
    options: List[str] = Field(default_factory=list, description="MCQ options")
    correct_answer: str = Field(..., description="Correct answer (index for MCQ, text for others)")
    explanation: str = Field('', max_length=1000, description="Answer explanation")
    tags: List[str] = Field(default_factory=list, description="Question tags")


class QuestionCreate(QuestionBase):
    """Schema for creating a question."""
    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question (all fields optional)."""
    type: Optional[QuestionType] = None
    difficulty: Optional[Difficulty] = None
    question: Optional[str] = Field(None, min_length=5, max_length=2000)
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class QuestionResponse(QuestionBase):
    """Schema for question response."""
    id: str
    times_used: int = 0
    correct_count: int = 0
    is_active: bool = True
    created_by: str = ''
    created_at: datetime
    # Computed field
    accuracy_rate: float = 0.0
    # Joined fields
    chapter_name: Optional[str] = None
    subject_name: Optional[str] = None

    model_config = {"from_attributes": True}


class QuestionBulkImport(BaseModel):
    """Schema for bulk importing questions."""
    questions: List[QuestionCreate] = Field(..., min_length=1)


class QuestionBulkDelete(BaseModel):
    """Schema for bulk deleting questions."""
    ids: List[str] = Field(..., min_length=1)


class QuestionListParams(BaseModel):
    """Query parameters for listing questions."""
    chapter_id: Optional[int] = None
    subject_id: Optional[str] = None
    type: Optional[QuestionType] = None
    difficulty: Optional[Difficulty] = None
    search: Optional[str] = None
    is_active: Optional[bool] = True
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


# ── Media Types ─────────────────────────────────────────────────

MediaType = Literal['image', 'video', 'audio', 'document']


class MediaBase(BaseModel):
    """Base media fields."""
    name: str = Field(..., min_length=1, max_length=255)
    type: MediaType = Field(..., description="Media type")
    subject_id: Optional[str] = Field(None, description="FK to subjects.id")
    chapter_id: Optional[int] = Field(None, description="FK to chapters.id")


class MediaCreate(MediaBase):
    """Schema for creating media entry (after upload)."""
    url: str = Field(..., description="Storage URL")
    thumbnail_url: str = Field('', description="Thumbnail URL")
    size_bytes: int = Field(0, ge=0)
    duration_sec: Optional[int] = Field(None, ge=0)
    dimensions: str = Field('', description="WxH for images/video")


class MediaUpdate(BaseModel):
    """Schema for updating media metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject_id: Optional[str] = None
    chapter_id: Optional[int] = None


class MediaResponse(MediaBase):
    """Schema for media response."""
    id: str
    url: str
    thumbnail_url: str = ''
    size_bytes: int = 0
    duration_sec: Optional[int] = None
    dimensions: str = ''
    usage_count: int = 0
    uploaded_by: str = ''
    uploaded_at: datetime
    # Joined fields
    chapter_name: Optional[str] = None
    subject_name: Optional[str] = None

    model_config = {"from_attributes": True}


class MediaBulkDelete(BaseModel):
    """Schema for bulk deleting media."""
    ids: List[str] = Field(..., min_length=1)


class MediaListParams(BaseModel):
    """Query parameters for listing media."""
    type: Optional[MediaType] = None
    chapter_id: Optional[int] = None
    subject_id: Optional[str] = None
    search: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


# ── Assessment Types ────────────────────────────────────────────

AssessmentType = Literal['quiz', 'mock_test', 'practice', 'assignment']
AssessmentDifficulty = Literal['easy', 'medium', 'hard', 'mixed']
AssessmentStatus = Literal['draft', 'published', 'archived']


class AssessmentBase(BaseModel):
    """Base assessment fields."""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field('', max_length=500)
    board_id: str = Field(..., description="FK to boards.id")
    standard_id: str = Field(..., description="FK to standards.id")
    subject_id: str = Field(..., description="FK to subjects.id")
    chapter_id: Optional[int] = Field(None, description="FK to chapters.id")
    type: AssessmentType = Field('quiz', description="Assessment type")
    difficulty: AssessmentDifficulty = Field('mixed', description="Overall difficulty")
    question_ids: List[str] = Field(default_factory=list, description="Question IDs")
    time_limit_min: Optional[int] = Field(None, ge=1, le=180)
    total_marks: int = Field(0, ge=0)
    pass_marks: int = Field(0, ge=0)


class AssessmentCreate(AssessmentBase):
    """Schema for creating an assessment."""
    pass


class AssessmentUpdate(BaseModel):
    """Schema for updating an assessment."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    chapter_id: Optional[int] = None
    type: Optional[AssessmentType] = None
    difficulty: Optional[AssessmentDifficulty] = None
    question_ids: Optional[List[str]] = None
    time_limit_min: Optional[int] = Field(None, ge=1, le=180)
    total_marks: Optional[int] = Field(None, ge=0)
    pass_marks: Optional[int] = Field(None, ge=0)
    status: Optional[AssessmentStatus] = None


class AssessmentResponse(AssessmentBase):
    """Schema for assessment response."""
    id: int
    status: AssessmentStatus = 'draft'
    created_by: str = ''
    created_at: datetime
    published_at: Optional[datetime] = None
    # Computed
    question_count: int = 0
    # Joined fields
    board_name: Optional[str] = None
    standard_name: Optional[str] = None
    subject_name: Optional[str] = None
    chapter_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AssessmentListParams(BaseModel):
    """Query parameters for listing assessments."""
    board_id: Optional[str] = None
    standard_id: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[int] = None
    type: Optional[AssessmentType] = None
    status: Optional[AssessmentStatus] = None
    search: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class AssessmentBulkDelete(BaseModel):
    """Schema for bulk deleting assessments."""
    ids: List[int] = Field(..., min_length=1)
