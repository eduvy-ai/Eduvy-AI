"""
Home module schemas - Daily Brief and Daily Question.
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class DailyContentSave(BaseModel):
    """Request to save daily content."""
    content_type: str  # 'brief' or 'dailyq'
    content: str       # JSON string for dailyq, plain text for brief
    language: str = "English"


class DailyContentResponse(BaseModel):
    """Response for daily content."""
    content_type: str
    content: str
    language: str
    date: str
    exists: bool = True


class GenerateDailyQRequest(BaseModel):
    """Request to generate daily questions - full student context like a real teacher."""
    # Basic info
    standard: str           # e.g. "Class 8"
    board: str = "CBSE"     # CBSE, State Board, ICSE
    language: str = "English"  # Study medium
    
    # Student state
    mood: str = "okay"      # fresh, okay, stressed, tired
    
    # Progress data
    math_mastery: int = 0   # 0-100%
    science_mastery: int = 0
    weak_topics: List[str] = Field(default_factory=list)  # Topics from Bhool curve
    recent_topics: List[str] = Field(default_factory=list)  # Recently studied topics


class DailyQuestion(BaseModel):
    """Single daily question."""
    q: str        # Question text
    a: str        # Answer text
    concept: str  # Topic/concept in English
    subject: str  # Subject name in English


class GenerateDailyQResponse(BaseModel):
    """Response with generated questions."""
    questions: List[DailyQuestion]
    saved: bool = False


class GenerateBriefRequest(BaseModel):
    """Request to generate daily brief - student context."""
    standard: str           # e.g. "Class 8"
    board: str = "CBSE"
    language: str = "English"
    mood: str = "okay"      # fresh, okay, stressed, tired
    subjects: List[str] = Field(default_factory=list)


class GenerateBriefResponse(BaseModel):
    """Response with generated brief."""
    brief: str
    saved: bool = False


# ── Study Plan ────────────────────────────────────────────────────────
class StudyPlanRequest(BaseModel):
    """Request for subject study plan."""
    subject: str            # e.g. "Mathematics"
    mastery: int = 0        # 0-100%
    standard: str           # e.g. "Class 10"
    board: str = "CBSE"
    language: str = "English"


class StudyPlanResponse(BaseModel):
    """Response with study plan."""
    plan: str
    saved: bool = False


# ── Exam Oracle ───────────────────────────────────────────────────────
class ExamOracleRequest(BaseModel):
    """Request for exam topic predictions."""
    standard: str
    board: str = "CBSE"
    language: str = "English"
    subjects: List[str] = Field(default_factory=list)


class OracleTopic(BaseModel):
    """Single predicted topic."""
    topic: str
    subject: str
    pct: int  # likelihood percentage


class ExamOracleResponse(BaseModel):
    """Response with predicted topics."""
    topics: List[OracleTopic]
    saved: bool = False


# ── Deep Dive ─────────────────────────────────────────────────────────
class DeepDiveRequest(BaseModel):
    """Request for topic deep dive."""
    topic: str
    subject: str
    standard: str
    board: str = "CBSE"
    language: str = "English"


class DeepDiveResponse(BaseModel):
    """Response with deep dive content."""
    content: str
    saved: bool = False
