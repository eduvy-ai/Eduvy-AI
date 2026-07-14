"""
Configuration settings loaded from environment variables.
All settings centralized here - change .env, nothing else.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _env_float(name: str, default: float) -> float:
    """Parse a float env var, tolerating empty/invalid values instead of
    crashing the whole app at import time (a blank R2_STORAGE_LIMIT_GB used to
    raise ValueError here and take every endpoint down)."""
    try:
        raw = os.getenv(name, "")
        return float(raw) if raw.strip() else default
    except (TypeError, ValueError):
        return default


class Settings:
    """Application settings from environment variables."""
    
    # ── Database ──────────────────────────────────────────────
    # Supports: postgresql://, sqlite:///, mysql://
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    # Individual DB params (alternative to DATABASE_URL)
    DB_HOST: str = os.getenv("DB_HOST", "")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASS: str = os.getenv("DB_PASS", "")
    DB_NAME: str = os.getenv("DB_NAME", "eduvyai")
    
    # Pool settings
    DB_POOL_MIN: int = int(os.getenv("DB_POOL_MIN", "2"))
    DB_POOL_MAX: int = int(os.getenv("DB_POOL_MAX", "20"))
    
    # ── JWT Auth ──────────────────────────────────────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "eduvyai-change-me")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "30"))
    
    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,https://eduvy-ai.vercel.app,https://www.eduvy.co.in,https://eduvy.co.in"
    )
    
    # ── Environment ───────────────────────────────────────────
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    @property
    def is_production(self) -> bool:
        return self.ENV == "production"
    
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── Cloudflare R2 Storage ─────────────────────────────────
    R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "eduvyai")
    R2_PUBLIC_URL: str = os.getenv("R2_PUBLIC_URL", "")
    R2_STORAGE_LIMIT_GB: float = _env_float("R2_STORAGE_LIMIT_GB", 5.0)
    
    @property
    def r2_endpoint_url(self) -> str:
        """R2 S3-compatible endpoint URL."""
        if self.R2_ACCOUNT_ID:
            return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return ""
    
    @property
    def r2_storage_limit_bytes(self) -> int:
        """Storage limit in bytes."""
        return int(self.R2_STORAGE_LIMIT_GB * 1024 * 1024 * 1024)
    
    @property
    def r2_configured(self) -> bool:
        """Check if R2 is properly configured."""
        return bool(self.R2_ACCOUNT_ID and self.R2_ACCESS_KEY_ID and self.R2_SECRET_ACCESS_KEY)


settings = Settings()
