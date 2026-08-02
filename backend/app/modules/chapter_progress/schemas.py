"""
Chapter Progress Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ── Notes ──────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: str


class NoteResponse(BaseModel):
    id: int
    chapter_id: int
    content: str
    created_at: datetime
    updated_at: datetime


# ── Summaries ──────────────────────────────────────────────────

class SummarySave(BaseModel):
    summary: str
    key_points: List[str] = []


class SummaryResponse(BaseModel):
    id: int
    chapter_id: int
    summary: str
    key_points: List[str] = []
    generated_at: datetime


# ── Uploads ────────────────────────────────────────────────────

class UploadCreate(BaseModel):
    name: str
    url: str
    file_type: str  # pdf, image, text
    file_size: int


class UploadResponse(BaseModel):
    id: int
    chapter_id: int
    name: str
    url: str
    file_type: str
    file_size: int
    uploaded_at: datetime
    extraction_status: str = 'pending'  # pending, processing, completed, failed
    extraction_error: Optional[str] = None
    has_content: bool = False  # True if extracted_text is not empty


# ── Quiz History ───────────────────────────────────────────────

class QuizHistorySave(BaseModel):
    mode: str  # quick, full, practice
    score: int
    total: int
    time_spent: int  # seconds
    questions: List[dict]  # Serialized questions with answers


class QuizHistoryResponse(BaseModel):
    id: int
    chapter_id: int
    mode: str
    score: int
    total: int
    time_spent: int
    questions: List[dict]
    completed_at: datetime


# ── Quiz Bookmarks ─────────────────────────────────────────────

class QuizBookmarkSave(BaseModel):
    question: str
    options: List[str]
    correct_idx: int
    explanation: str


class QuizBookmarkResponse(BaseModel):
    id: int
    chapter_id: int
    question: str
    options: List[str]
    correct_idx: int
    explanation: str
    bookmarked_at: datetime


# ── Video History ──────────────────────────────────────────────

class VideoHistorySave(BaseModel):
    video_id: str
    title: str
    search_query: str = ""
    youtube_video_id: Optional[str] = None


class VideoHistoryResponse(BaseModel):
    id: int
    chapter_id: int
    video_id: str
    title: str
    search_query: str
    youtube_video_id: Optional[str]
    watched_at: datetime


# ── Video Bookmarks ────────────────────────────────────────────

class VideoBookmarkSave(BaseModel):
    video_id: str
    title: str
    description: str = ""
    concept: str = ""
    search_query: str = ""
    youtube_video_id: Optional[str] = None


class VideoBookmarkResponse(BaseModel):
    id: int
    chapter_id: int
    video_id: str
    title: str
    description: str
    concept: str
    search_query: str
    youtube_video_id: Optional[str]
    bookmarked_at: datetime


# ── Flashcard Sets ─────────────────────────────────────────────

class FlashcardSetSave(BaseModel):
    name: str
    cards: List[dict]  # [{front, back}, ...]


class FlashcardSetUpdate(BaseModel):
    name: Optional[str] = None
    cards: Optional[List[dict]] = None
    mastery: Optional[dict] = None  # {card_idx: mastery_level}
    reviewed_count: Optional[int] = None


class FlashcardSetResponse(BaseModel):
    id: int
    chapter_id: int
    chapter_name: str  # Map from 'name' column
    cards: List[dict]
    mastery: dict
    reviewed_count: int
    created_at: datetime
    updated_at: datetime


# ── AI Chat Sessions ───────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    title: str = "New Chat"


class ChatSessionResponse(BaseModel):
    id: str  # UUID string
    chapter_id: int
    title: str
    messages: List[dict] = []
    created_at: datetime
    updated_at: datetime


class ChatMessageSave(BaseModel):
    role: str  # user, assistant
    content: str


class ChatMessageResponse(BaseModel):
    id: int
    session_id: str  # UUID string
    role: str
    content: str
    created_at: datetime
