"""
R2 Storage Service — Cloudflare R2 (S3-compatible) storage with usage tracking.

Features:
- Upload/download/delete files to R2
- Track storage usage per user and globally
- Enforce 5GB storage limit with alerts
- Automatic cleanup of old files
"""
import asyncio
import hashlib
import logging
import os
from datetime import datetime, timezone
from typing import BinaryIO, Dict, Optional, Tuple

from app.core.config import settings
from app.db.connection import get_db

logger = logging.getLogger(__name__)

# Storage tracking table name
STORAGE_TABLE = "r2_storage_usage"


class StorageLimitExceeded(Exception):
    """Raised when storage limit is exceeded."""
    def __init__(self, current_bytes: int, limit_bytes: int):
        self.current_bytes = current_bytes
        self.limit_bytes = limit_bytes
        self.current_gb = current_bytes / (1024 ** 3)
        self.limit_gb = limit_bytes / (1024 ** 3)
        super().__init__(
            f"Storage limit exceeded: {self.current_gb:.2f}GB / {self.limit_gb:.2f}GB"
        )


def _get_r2_client():
    """Get boto3 S3 client configured for Cloudflare R2."""
    import boto3
    from botocore.config import Config
    
    if not settings.r2_configured:
        raise RuntimeError("R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env")
    
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "adaptive"},
        ),
        region_name="auto",  # R2 uses 'auto' region
    )


def _ensure_storage_table():
    """Ensure storage tracking table exists."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {STORAGE_TABLE} (
                id SERIAL PRIMARY KEY,
                file_key TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                file_size BIGINT NOT NULL,
                content_type TEXT DEFAULT 'application/octet-stream',
                category TEXT DEFAULT 'general',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                metadata JSONB DEFAULT '{{}}'
            )
        """)
        cur.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_{STORAGE_TABLE}_user_id ON {STORAGE_TABLE}(user_id)
        """)
        cur.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_{STORAGE_TABLE}_category ON {STORAGE_TABLE}(category)
        """)
        conn.commit()
    finally:
        conn.close()


def get_total_storage_usage() -> int:
    """Get total storage usage in bytes across all users."""
    _ensure_storage_table()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(SUM(file_size), 0) as total FROM {STORAGE_TABLE}")
        row = cur.fetchone()
        return int(row["total"]) if row else 0
    finally:
        conn.close()


def get_user_storage_usage(user_id: str) -> int:
    """Get storage usage for a specific user in bytes."""
    _ensure_storage_table()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT COALESCE(SUM(file_size), 0) as total FROM {STORAGE_TABLE} WHERE user_id = %s",
            (user_id,)
        )
        row = cur.fetchone()
        return int(row["total"]) if row else 0
    finally:
        conn.close()


def get_storage_stats() -> Dict:
    """Get comprehensive storage statistics."""
    _ensure_storage_table()
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # Total usage
        cur.execute(f"SELECT COALESCE(SUM(file_size), 0) as total FROM {STORAGE_TABLE}")
        total_bytes = int(cur.fetchone()["total"] or 0)
        
        # File count
        cur.execute(f"SELECT COUNT(*) as count FROM {STORAGE_TABLE}")
        file_count = int(cur.fetchone()["count"] or 0)
        
        # Usage by category
        cur.execute(f"""
            SELECT category, SUM(file_size) as bytes, COUNT(*) as count
            FROM {STORAGE_TABLE}
            GROUP BY category
        """)
        by_category = {row["category"]: {"bytes": int(row["bytes"]), "count": int(row["count"])} for row in cur.fetchall()}
        
        # Top users
        cur.execute(f"""
            SELECT user_id, SUM(file_size) as bytes, COUNT(*) as count
            FROM {STORAGE_TABLE}
            GROUP BY user_id
            ORDER BY bytes DESC
            LIMIT 10
        """)
        top_users = [{"user_id": row["user_id"], "bytes": int(row["bytes"]), "count": int(row["count"])} for row in cur.fetchall()]
        
        limit_bytes = settings.r2_storage_limit_bytes
        usage_percent = (total_bytes / limit_bytes * 100) if limit_bytes > 0 else 0
        
        return {
            "total_bytes": total_bytes,
            "total_gb": round(total_bytes / (1024 ** 3), 3),
            "limit_bytes": limit_bytes,
            "limit_gb": settings.R2_STORAGE_LIMIT_GB,
            "usage_percent": round(usage_percent, 2),
            "remaining_bytes": max(0, limit_bytes - total_bytes),
            "remaining_gb": round(max(0, limit_bytes - total_bytes) / (1024 ** 3), 3),
            "file_count": file_count,
            "by_category": by_category,
            "top_users": top_users,
            "is_limit_reached": total_bytes >= limit_bytes,
            "is_warning": usage_percent >= 80,
        }
    finally:
        conn.close()


def check_storage_limit(additional_bytes: int = 0) -> Tuple[bool, Dict]:
    """
    Check if storage limit would be exceeded.
    
    Args:
        additional_bytes: Bytes about to be added
    
    Returns:
        (can_store: bool, stats: Dict)
    """
    stats = get_storage_stats()
    new_total = stats["total_bytes"] + additional_bytes
    can_store = new_total <= stats["limit_bytes"]
    
    return can_store, {
        **stats,
        "requested_bytes": additional_bytes,
        "would_total_bytes": new_total,
        "would_exceed": not can_store,
    }


def _track_file(file_key: str, user_id: str, file_size: int, content_type: str, category: str, metadata: dict = None):
    """Track a file in the storage table."""
    _ensure_storage_table()
    conn = get_db()
    try:
        import json
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {STORAGE_TABLE} (file_key, user_id, file_size, content_type, category, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (file_key) DO UPDATE SET
                    file_size = EXCLUDED.file_size,
                    content_type = EXCLUDED.content_type,
                    category = EXCLUDED.category,
                    metadata = EXCLUDED.metadata""",
            (file_key, user_id, file_size, content_type, category, json.dumps(metadata or {}))
        )
        conn.commit()
    finally:
        conn.close()


def _untrack_file(file_key: str) -> int:
    """Remove file tracking and return its size."""
    _ensure_storage_table()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT file_size FROM {STORAGE_TABLE} WHERE file_key = %s", (file_key,))
        row = cur.fetchone()
        size = int(row["file_size"]) if row else 0
        
        cur.execute(f"DELETE FROM {STORAGE_TABLE} WHERE file_key = %s", (file_key,))
        conn.commit()
        return size
    finally:
        conn.close()


class R2Storage:
    """
    Cloudflare R2 Storage with usage tracking and limits.
    
    Usage:
        storage = R2Storage()
        
        # Upload file
        url = await storage.upload(
            file_data=open("file.mp3", "rb"),
            key="audio/user123/beat1.mp3",
            user_id="user123",
            content_type="audio/mpeg",
            category="teacher_audio"
        )
        
        # Check storage
        stats = storage.get_stats()
        if stats["is_warning"]:
            print(f"Warning: {stats['usage_percent']}% storage used")
        
        # Delete file
        await storage.delete("audio/user123/beat1.mp3")
    """
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            self._client = _get_r2_client()
        return self._client
    
    @property
    def bucket(self) -> str:
        return settings.R2_BUCKET_NAME
    
    @property
    def configured(self) -> bool:
        return settings.r2_configured
    
    def get_stats(self) -> Dict:
        """Get storage statistics."""
        return get_storage_stats()
    
    def check_limit(self, file_size: int) -> Tuple[bool, Dict]:
        """Check if file can be stored within limits."""
        return check_storage_limit(file_size)
    
    async def upload(
        self,
        file_data: BinaryIO,
        key: str,
        user_id: str,
        content_type: str = "application/octet-stream",
        category: str = "general",
        metadata: dict = None,
        check_limit: bool = True,
    ) -> str:
        """
        Upload file to R2.
        
        Args:
            file_data: File-like object or bytes
            key: Storage path (e.g., "audio/user123/beat1.mp3")
            user_id: User who owns this file
            content_type: MIME type
            category: Category for tracking (teacher_audio, notebook, video, etc.)
            metadata: Additional metadata to store
            check_limit: Whether to enforce storage limit
        
        Returns:
            Public URL of the uploaded file
        
        Raises:
            StorageLimitExceeded: If storage limit would be exceeded
        """
        if not self.configured:
            raise RuntimeError("R2 storage not configured")
        
        # Get file size
        if isinstance(file_data, bytes):
            file_size = len(file_data)
        else:
            file_data.seek(0, 2)  # Seek to end
            file_size = file_data.tell()
            file_data.seek(0)  # Reset to beginning
        
        # Check storage limit
        if check_limit:
            can_store, stats = self.check_limit(file_size)
            if not can_store:
                raise StorageLimitExceeded(stats["total_bytes"], stats["limit_bytes"])
            
            # Warning at 80%
            if stats["usage_percent"] >= 80:
                logger.warning(
                    f"Storage warning: {stats['usage_percent']:.1f}% used "
                    f"({stats['total_gb']:.2f}GB / {stats['limit_gb']}GB)"
                )
        
        # Upload to R2
        def _upload():
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_data if isinstance(file_data, bytes) else file_data.read(),
                ContentType=content_type,
            )
        
        await asyncio.to_thread(_upload)
        
        # Track in database
        _track_file(key, user_id, file_size, content_type, category, metadata)
        
        logger.info(f"Uploaded to R2: {key} ({file_size} bytes, {category})")
        
        # Return public URL
        if settings.R2_PUBLIC_URL:
            return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
        return f"{settings.r2_endpoint_url}/{self.bucket}/{key}"
    
    async def upload_file(
        self,
        file_path: str,
        key: str,
        user_id: str,
        content_type: str = None,
        category: str = "general",
        metadata: dict = None,
        delete_local: bool = True,
    ) -> str:
        """
        Upload a local file to R2.
        
        Args:
            file_path: Path to local file
            key: Storage path in R2
            user_id: User who owns this file
            content_type: MIME type (auto-detected if not provided)
            category: Category for tracking
            metadata: Additional metadata
            delete_local: Delete local file after upload
        
        Returns:
            Public URL of the uploaded file
        """
        import mimetypes
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if content_type is None:
            content_type, _ = mimetypes.guess_type(file_path)
            content_type = content_type or "application/octet-stream"
        
        with open(file_path, "rb") as f:
            url = await self.upload(
                file_data=f,
                key=key,
                user_id=user_id,
                content_type=content_type,
                category=category,
                metadata=metadata,
            )
        
        if delete_local:
            try:
                os.remove(file_path)
                logger.debug(f"Deleted local file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete local file {file_path}: {e}")
        
        return url
    
    async def download(self, key: str) -> bytes:
        """Download file from R2."""
        if not self.configured:
            raise RuntimeError("R2 storage not configured")
        
        def _download():
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        
        return await asyncio.to_thread(_download)
    
    async def delete(self, key: str) -> bool:
        """
        Delete file from R2 and remove tracking.
        
        Returns:
            True if deleted, False if not found
        """
        if not self.configured:
            raise RuntimeError("R2 storage not configured")
        
        def _delete():
            try:
                self.client.delete_object(Bucket=self.bucket, Key=key)
                return True
            except Exception as e:
                logger.warning(f"Failed to delete from R2: {key}: {e}")
                return False
        
        deleted = await asyncio.to_thread(_delete)
        
        if deleted:
            freed_bytes = _untrack_file(key)
            logger.info(f"Deleted from R2: {key} (freed {freed_bytes} bytes)")
        
        return deleted
    
    async def delete_prefix(self, prefix: str) -> int:
        """
        Delete all files with a given prefix.
        
        Args:
            prefix: Key prefix (e.g., "audio/user123/")
        
        Returns:
            Number of files deleted
        """
        if not self.configured:
            raise RuntimeError("R2 storage not configured")
        
        def _list_and_delete():
            deleted_count = 0
            paginator = self.client.get_paginator("list_objects_v2")
            
            for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                if "Contents" not in page:
                    continue
                
                for obj in page["Contents"]:
                    key = obj["Key"]
                    try:
                        self.client.delete_object(Bucket=self.bucket, Key=key)
                        _untrack_file(key)
                        deleted_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to delete {key}: {e}")
            
            return deleted_count
        
        count = await asyncio.to_thread(_list_and_delete)
        logger.info(f"Deleted {count} files with prefix: {prefix}")
        return count
    
    async def exists(self, key: str) -> bool:
        """Check if file exists in R2."""
        if not self.configured:
            return False
        
        def _exists():
            try:
                self.client.head_object(Bucket=self.bucket, Key=key)
                return True
            except Exception:
                return False
        
        return await asyncio.to_thread(_exists)
    
    def get_url(self, key: str) -> str:
        """Get public URL for a key."""
        if settings.R2_PUBLIC_URL:
            return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
        return f"{settings.r2_endpoint_url}/{self.bucket}/{key}"
    
    async def cleanup_expired(self) -> int:
        """
        Delete files past their expiration date.
        
        Returns:
            Number of files deleted
        """
        _ensure_storage_table()
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT file_key FROM {STORAGE_TABLE} WHERE expires_at IS NOT NULL AND expires_at < NOW()"
            )
            expired_keys = [row["file_key"] for row in cur.fetchall()]
        finally:
            conn.close()
        
        deleted_count = 0
        for key in expired_keys:
            if await self.delete(key):
                deleted_count += 1
        
        if deleted_count:
            logger.info(f"Cleaned up {deleted_count} expired files")
        
        return deleted_count


# Global instance
r2_storage = R2Storage()


# ── Convenience functions ─────────────────────────────────────────────────────

async def upload_to_r2(
    file_data: BinaryIO,
    key: str,
    user_id: str,
    content_type: str = "application/octet-stream",
    category: str = "general",
) -> str:
    """Upload file to R2. Raises StorageLimitExceeded if limit reached."""
    return await r2_storage.upload(file_data, key, user_id, content_type, category)


async def upload_file_to_r2(
    file_path: str,
    key: str,
    user_id: str,
    content_type: str = None,
    category: str = "general",
    delete_local: bool = True,
) -> str:
    """Upload local file to R2."""
    return await r2_storage.upload_file(file_path, key, user_id, content_type, category, delete_local=delete_local)


async def delete_from_r2(key: str) -> bool:
    """Delete file from R2."""
    return await r2_storage.delete(key)


def get_r2_storage_stats() -> Dict:
    """Get R2 storage statistics."""
    return r2_storage.get_stats()


def is_r2_configured() -> bool:
    """Check if R2 is configured."""
    return r2_storage.configured
