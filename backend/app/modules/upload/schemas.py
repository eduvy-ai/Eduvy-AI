"""
Upload Schemas — Request/Response validation models.
"""
from pydantic import BaseModel
from typing import Optional, List


class UploadResponse(BaseModel):
    """Response after successful file upload."""
    url: str
    key: str
    file_size: int
    content_type: str
    category: str


class UploadErrorResponse(BaseModel):
    """Error response for upload failures."""
    error: str
    code: str  # limit_exceeded, invalid_type, file_too_large, etc.
    details: Optional[dict] = None


class AllowedFileTypes(BaseModel):
    """Configuration for allowed file types per category."""
    category: str
    max_size_mb: int
    allowed_extensions: List[str]
    allowed_mimetypes: List[str]


# File upload configurations per category
UPLOAD_CONFIGS = {
    "avatar": {
        "max_size_mb": 2,
        "allowed_extensions": [".jpg", ".jpeg", ".png", ".webp"],
        "allowed_mimetypes": ["image/jpeg", "image/png", "image/webp"],
        "path_template": "avatars/{user_id}/{filename}",
    },
    "notebook": {
        "max_size_mb": 10,
        "allowed_extensions": [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".txt", ".md"],
        "allowed_mimetypes": [
            "application/pdf",
            "image/jpeg", "image/png", "image/webp",
            "text/plain", "text/markdown",
        ],
        "path_template": "notebook/{user_id}/{filename}",
    },
    "bhool": {
        "max_size_mb": 5,
        "allowed_extensions": [".jpg", ".jpeg", ".png", ".webp"],
        "allowed_mimetypes": ["image/jpeg", "image/png", "image/webp"],
        "path_template": "bhool/{user_id}/{filename}",
    },
    "general": {
        "max_size_mb": 5,
        "allowed_extensions": [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
        "allowed_mimetypes": [
            "image/jpeg", "image/png", "image/webp",
            "application/pdf",
        ],
        "path_template": "uploads/{user_id}/{filename}",
    },
}
