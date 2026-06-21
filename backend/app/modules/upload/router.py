"""
Upload Router — File upload endpoints with R2 storage.
"""
import hashlib
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.dependencies import get_current_user
from app.modules.upload.schemas import UPLOAD_CONFIGS, UploadResponse
from app.services.r2_storage import (
    StorageLimitExceeded,
    is_r2_configured,
    r2_storage,
)

router = APIRouter(prefix="/upload", tags=["Upload"])

# Max file size across all categories (safety limit)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


def _validate_file(
    file: UploadFile,
    category: str,
) -> tuple[bool, str]:
    """
    Validate uploaded file against category rules.
    
    Returns:
        (valid: bool, error_message: str)
    """
    config = UPLOAD_CONFIGS.get(category, UPLOAD_CONFIGS["general"])
    
    # Check extension
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in config["allowed_extensions"]:
        return False, f"File type '{ext}' not allowed. Allowed: {', '.join(config['allowed_extensions'])}"
    
    # Check MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in config["allowed_mimetypes"]:
        return False, f"MIME type '{content_type}' not allowed"
    
    return True, ""


def _generate_key(user_id: str, filename: str, category: str) -> str:
    """Generate unique storage key for file."""
    config = UPLOAD_CONFIGS.get(category, UPLOAD_CONFIGS["general"])
    
    # Generate unique filename with hash
    ext = os.path.splitext(filename)[1].lower()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = hashlib.md5(f"{user_id}{filename}{timestamp}{uuid.uuid4()}".encode()).hexdigest()[:8]
    safe_filename = f"{timestamp}_{unique_id}{ext}"
    
    # Apply template
    key = config["path_template"].format(
        user_id=user_id,
        filename=safe_filename,
    )
    
    return key


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(default="general"),
    current_user: str = Depends(get_current_user),
):
    """
    Upload a file to R2 storage.
    
    Categories:
    - `avatar`: Profile pictures (max 2MB, images only)
    - `notebook`: Notebook source files (max 10MB, PDF/images/text)
    - `bhool`: Bhool card images (max 5MB, images only)
    - `general`: General uploads (max 5MB, images/PDF)
    
    Returns the public URL of the uploaded file.
    
    Errors:
    - 400: Invalid file type or too large
    - 507: Storage limit reached (5GB total)
    - 503: R2 storage not configured
    """
    # Check R2 configured
    if not is_r2_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Storage not configured",
                "code": "storage_unavailable",
            }
        )
    
    # Validate category
    if category not in UPLOAD_CONFIGS:
        category = "general"
    
    config = UPLOAD_CONFIGS[category]
    
    # Validate file type
    valid, error = _validate_file(file, category)
    if not valid:
        raise HTTPException(
            status_code=400,
            detail={
                "error": error,
                "code": "invalid_file_type",
            }
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Check file size against category limit
    max_size = config["max_size_mb"] * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"File too large. Max size: {config['max_size_mb']}MB",
                "code": "file_too_large",
                "max_mb": config["max_size_mb"],
                "file_mb": round(file_size / (1024 * 1024), 2),
            }
        )
    
    # Check global max
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "File exceeds maximum allowed size",
                "code": "file_too_large",
            }
        )
    
    # Generate storage key
    key = _generate_key(current_user, file.filename or "file", category)
    content_type = file.content_type or "application/octet-stream"
    
    # Upload to R2
    try:
        url = await r2_storage.upload(
            file_data=content,
            key=key,
            user_id=current_user,
            content_type=content_type,
            category=category,
            metadata={
                "original_filename": file.filename,
                "uploaded_by": current_user,
            },
            check_limit=True,
        )
        
        return UploadResponse(
            url=url,
            key=key,
            file_size=file_size,
            content_type=content_type,
            category=category,
        )
        
    except StorageLimitExceeded as e:
        raise HTTPException(
            status_code=507,
            detail={
                "error": f"Storage limit reached: {e.current_gb:.2f}GB / {e.limit_gb:.2f}GB",
                "code": "limit_exceeded",
                "current_gb": round(e.current_gb, 2),
                "limit_gb": round(e.limit_gb, 2),
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Upload failed: {str(e)}",
                "code": "upload_error",
            }
        )


@router.delete("")
async def delete_uploaded_file(
    key: str,
    current_user: str = Depends(get_current_user),
):
    """
    Delete an uploaded file from R2.
    
    Only the owner can delete their files.
    """
    if not is_r2_configured():
        raise HTTPException(status_code=503, detail="Storage not configured")
    
    # Verify ownership (key should contain user_id)
    if current_user not in key:
        raise HTTPException(status_code=403, detail="Cannot delete files you don't own")
    
    try:
        deleted_size = await r2_storage.delete(key)
        return {
            "deleted": True,
            "key": key,
            "freed_bytes": deleted_size,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Delete failed: {str(e)}"
        )
