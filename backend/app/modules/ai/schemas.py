"""
AI Schemas - Request/Response validation models.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    system_prompt: str = ""
    mode: str = ""
    history: List[ChatMessage] = []
    max_tokens: int = 1024


class VisionRequest(BaseModel):
    """Request to extract content from an image."""
    image_base64: str = Field(..., min_length=100, description="Base64-encoded image data")
    mime_type: str = Field(default="image/png", description="Image MIME type (image/png, image/jpeg, etc.)")
    prompt: str = Field(default="", description="Optional prompt for extraction")
    language: str = Field(default="English", description="Language for response")


class VisionResponse(BaseModel):
    """Response from image content extraction."""
    content: str
    is_educational: bool
    summary: str


class UsageResponse(BaseModel):
    today_calls: int
    today_tokens: int
    month_calls: int
    month_tokens: int
    daily_limit: int
    plan: str


# ── Study Coach Schemas ──────────────────────────────────────────────────────

class StudyCoachMode(BaseModel):
    """Valid Study Coach modes."""
    mode: str = Field(
        default="study_coach",
        pattern="^study_coach(_eli10|_exam|_coding|_revision)?$",
        description="study_coach | study_coach_eli10 | study_coach_exam | study_coach_coding | study_coach_revision"
    )


class StudyCoachRequest(BaseModel):
    """Request to Study Coach for a learning experience."""
    question: str = Field(..., min_length=3, max_length=2000, description="The question or topic to learn about")
    mode: str = Field(
        default="study_coach",
        description="Learning mode: study_coach, study_coach_eli10, study_coach_exam, study_coach_coding, study_coach_revision"
    )
    subject_override: Optional[str] = Field(default=None, description="Override the subject from profile")
    chapter_override: Optional[str] = Field(default=None, description="Specific chapter context")


class DiagramData(BaseModel):
    """Mermaid diagram data."""
    type: str = Field(default="flowchart", description="Diagram type: flowchart, mindmap, sequence, classDiagram")
    content: str = Field(default="", description="Mermaid diagram syntax")


class QuizQuestion(BaseModel):
    """A single quiz question."""
    question: str
    options: List[str] = Field(default_factory=list, min_length=4, max_length=4)
    correct_answer: str = Field(description="Correct option letter (A, B, C, or D)")
    explanation: str = Field(default="")


class Flashcard(BaseModel):
    """A single flashcard."""
    front: str
    back: str


class CodeExample(BaseModel):
    """A code example for coding mode."""
    language: str = Field(default="python")
    title: str = Field(default="")
    code: str
    explanation: str = Field(default="")


class MemoryAids(BaseModel):
    """Memory aids for revision mode."""
    mnemonics: List[str] = Field(default_factory=list)
    acronyms: List[str] = Field(default_factory=list)
    patterns: List[str] = Field(default_factory=list)


class StudyCoachResponse(BaseModel):
    """Complete Study Coach response with all learning sections."""
    title: str
    difficulty: str = Field(default="Intermediate")
    overview: str
    key_takeaways: List[str] = Field(default_factory=list)
    diagram: Optional[DiagramData] = None
    real_world_example: str = Field(default="")
    quiz: List[QuizQuestion] = Field(default_factory=list)
    flashcards: List[Flashcard] = Field(default_factory=list)
    exam_notes: List[str] = Field(default_factory=list)
    related_topics: List[str] = Field(default_factory=list)
    next_topic: str = Field(default="")
    # Optional fields for specific modes
    code_examples: Optional[List[CodeExample]] = None  # For coding mode
    memory_aids: Optional[MemoryAids] = None  # For revision mode
    # Metadata
    mode: str = Field(default="study_coach")
    usage: Optional[dict] = None


# ── Teacher Mode Audio Schemas ───────────────────────────────────────────────


class WordTiming(BaseModel):
    """Word-level timing for karaoke highlighting."""
    word: str
    start_ms: int
    end_ms: int


class TeacherBeat(BaseModel):
    """A single beat (1-2 sentences) in Teacher Mode narration."""
    id: str
    text: str
    audio_url: str
    duration_ms: int
    word_timings: List[WordTiming] = Field(default_factory=list)
    section: str = Field(default="overview", description="Which section this beat belongs to")
    diagram_id: Optional[str] = None


class TeacherAudioRequest(BaseModel):
    """Request to generate Teacher Mode audio for Study Coach content."""
    content: str = Field(..., min_length=10, max_length=10000, description="Text content to explain")
    section: str = Field(default="overview", description="Section identifier (overview, takeaways, example)")
    language: str = Field(default="English", description="Language for TTS voice")
    full_lesson: bool = Field(default=False, description="Generate full lesson with all sections")
    # For full lesson mode, pass the complete StudyCoachResponse
    study_coach_response: Optional[dict] = None


class TeacherAudioResponse(BaseModel):
    """Response with generated Teacher Mode audio and timings."""
    beats: List[TeacherBeat]
    total_duration_ms: int
    language: str
    cache_key: Optional[str] = None
