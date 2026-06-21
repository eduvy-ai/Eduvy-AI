"""
Storage Router — Admin endpoints for R2 storage management.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.db.connection import get_db
from app.services.r2_storage import get_r2_storage_stats, is_r2_configured, r2_storage

router = APIRouter(prefix="/storage", tags=["Storage"])


def _is_admin(user_id: str) -> bool:
    """Check if user is admin."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return row and row.get("role") in ("admin", "superadmin")
    finally:
        conn.close()


@router.get("/stats")
async def get_storage_stats(current_user: str = Depends(get_current_user)):
    """
    Get R2 storage statistics.
    
    Returns storage usage, limits, and breakdown by category.
    Admin only.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not is_r2_configured():
        return {
            "configured": False,
            "message": "R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env"
        }
    
    stats = get_r2_storage_stats()
    return {
        "configured": True,
        **stats,
    }


@router.get("/health")
async def storage_health():
    """
    Public health check for storage.
    
    Returns whether storage is configured and within limits.
    Does not require authentication.
    """
    if not is_r2_configured():
        return {
            "status": "not_configured",
            "can_upload": False,
            "message": "Storage not configured",
        }
    
    stats = get_r2_storage_stats()
    
    if stats["is_limit_reached"]:
        return {
            "status": "limit_reached",
            "can_upload": False,
            "usage_percent": stats["usage_percent"],
            "message": f"Storage limit reached: {stats['total_gb']:.2f}GB / {stats['limit_gb']}GB",
        }
    
    if stats["is_warning"]:
        return {
            "status": "warning",
            "can_upload": True,
            "usage_percent": stats["usage_percent"],
            "remaining_gb": stats["remaining_gb"],
            "message": f"Storage warning: {stats['usage_percent']:.1f}% used",
        }
    
    return {
        "status": "ok",
        "can_upload": True,
        "usage_percent": stats["usage_percent"],
        "remaining_gb": stats["remaining_gb"],
    }


@router.delete("/cleanup")
async def cleanup_expired_files(current_user: str = Depends(get_current_user)):
    """
    Clean up expired files from R2.
    
    Admin only.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not is_r2_configured():
        raise HTTPException(status_code=400, detail="R2 storage not configured")
    
    deleted_count = await r2_storage.cleanup_expired()
    
    return {
        "deleted_count": deleted_count,
        "message": f"Cleaned up {deleted_count} expired files",
    }


@router.delete("/user/{user_id}")
async def delete_user_files(user_id: str, current_user: str = Depends(get_current_user)):
    """
    Delete all files for a specific user.
    
    Admin only.
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not is_r2_configured():
        raise HTTPException(status_code=400, detail="R2 storage not configured")
    
    # Delete all files with user's prefix
    deleted_count = await r2_storage.delete_prefix(f"users/{user_id}/")
    
    return {
        "user_id": user_id,
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} files for user {user_id}",
    }
