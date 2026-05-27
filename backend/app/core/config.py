"""
Configuration settings loaded from environment variables.
All settings centralized here - change .env, nothing else.
"""
import os
from dotenv import load_dotenv

load_dotenv()


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


settings = Settings()
