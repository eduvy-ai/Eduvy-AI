"""
Notebook Schemas - Request/Response validation models.
"""
from pydantic import BaseModel
from typing import Optional


class Source(BaseModel):
    id: str
    name: str
    type: str = "text"
    content: str = ""
    summary: str = ""
    icon: str = "📄"
    added_at: int = 0


class ChatMessage(BaseModel):
    role: str
    content: str


class StudioOutput(BaseModel):
    type: str
    output_json: str = "{}"


class UploadStatusResponse(BaseModel):
    """Response for upload status check."""
    can_upload: bool
    sources_count: int
    max_sources: int = 15
    violations: int
    max_violations: int = 5
    blocked: bool
    block_reason: str = ""


class ReportViolationRequest(BaseModel):
    """Request to report a content violation."""
    reason: str = "inappropriate_content"


class ValidateContentRequest(BaseModel):
    """Request to validate content before upload."""
    content: str
    content_type: str = "text"  # text, url, file
    filename: Optional[str] = None


class ValidateContentResponse(BaseModel):
    """Response from content validation."""
    valid: bool
    reason: str = ""
    summary: str = ""  # AI-generated summary if valid
