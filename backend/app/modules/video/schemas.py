"""
Video Module — Pydantic schemas (request/response models).
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Request models ────────────────────────────────────────────────────────────

class VideoGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    grade: str = Field(default="Class 10")
    subject: str = Field(default="General")
    engine: str = Field(default="sketch")          # sketch | canvas
    style_variant: str = Field(default="sketch_classic")
    narration_language: str = Field(default="en")
    onscreen_language: str = Field(default="en")
    orientation: str = Field(default="horizontal") # horizontal | vertical
    pacing: str = Field(default="normal")          # normal | fast
    timing: str = Field(default="2")               # minutes as string
    bg_music: bool = Field(default=False)
    voice_instructions: str = Field(default="")
    enable_captions: bool = Field(default=True)


class FrameRegenerateRequest(BaseModel):
    narration: Optional[str] = None
    svg_type: Optional[str] = None


# ── Response models ───────────────────────────────────────────────────────────

class VideoFrameOut(BaseModel):
    id: int
    video_id: str
    frame_index: int
    narration: str
    svg_spec: Dict[str, Any]
    frame_path: str
    status: str


class VideoProjectOut(BaseModel):
    id: str
    user_id: str
    title: str
    topic: str
    engine: str
    style_variant: str
    narration_language: str
    onscreen_language: str
    orientation: str
    pacing: str
    timing: str
    status: str
    file_path: Optional[str] = ""
    thumb_path: Optional[str] = ""
    share_token: Optional[str] = None
    duration_sec: int
    frame_count: int
    enable_captions: bool
    error_msg: Optional[str] = ""
    created_at: str
    completed_at: Optional[str]


class VideoStatusResponse(BaseModel):
    id: str
    status: str
    title: str
    frame_count: int
    processed_frames: int
    file_path: Optional[str] = ""
    thumb_path: Optional[str] = ""
    share_token: Optional[str] = None
    duration_sec: int
    error_msg: Optional[str] = ""


class VideoLibraryResponse(BaseModel):
    videos: List[VideoProjectOut]
    total: int
