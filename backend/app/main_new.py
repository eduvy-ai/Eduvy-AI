"""
Eduvy-AI Backend - New Modular Structure
=========================================

This is the NEW entry point using the modular structure.
To use: uvicorn app.main_new:app --reload

The old main.py still works - use this for new development.
"""
import os
import time
import warnings
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.core.config import settings
from app.db import init_db
from app.exceptions import register_exception_handlers

# Import routers from new modular structure
from app.modules.auth.router import router as auth_router
from app.modules.profile.router import router as profile_router
from app.modules.squads.router import router as squads_router
from app.modules.bhool.router import router as bhool_router
from app.modules.muqabla.router import router as muqabla_router
from app.modules.notebook.router import router as notebook_router
from app.modules.mastery.router import router as mastery_router
from app.modules.quiz_stats.router import router as quiz_router
from app.modules.curriculum.router import router as curriculum_router
from app.modules.parent.router import router as parent_router
from app.modules.sessions.router import router as sessions_router
from app.modules.ai.router import router as ai_router
from app.modules.referrals.router import router as referrals_router
from app.modules.payments.router import router as payments_router
from app.modules.drishti.router import router as drishti_router
from app.modules.fetch.router import router as fetch_router
from app.modules.admin.router import router as admin_router

load_dotenv()

# ── Warn if JWT secret is insecure ────────────────────────────
if settings.JWT_SECRET == "eduvyai-change-me":
    warnings.warn(
        "JWT_SECRET is using the insecure default value. "
        "Set a strong random secret in your .env file before deploying to production.",
        stacklevel=2,
    )

# ── Create FastAPI App ────────────────────────────────────────
app = FastAPI(
    title="Eduvy-AI Backend",
    description="Secure AI proxy + data store for Eduvy-AI",
    version="3.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# ── Register Exception Handlers ───────────────────────────────
register_exception_handlers(app)

# ── CORS Middleware ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB Init on Startup ────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()
    # Load API keys and plan routing from database
    try:
        from services.ai_service import load_plan_routing
        load_plan_routing()
        print("✅ API keys loaded from database")
    except Exception as e:
        print(f"⚠️ Could not load API keys from database: {e}")

# ── Security Headers Middleware ───────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ── Rate Limiting Middleware ──────────────────────────────────
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_RATE_RULES = {
    "/api/auth/login":    (10, 60),
    "/api/auth/register": (5,  60),
    "/api/admin/login":   (5,  60),
}

@app.middleware("http")
async def rate_limit_auth(request: Request, call_next):
    path = request.url.path
    if path in _RATE_RULES and request.method == "POST":
        limit, window = _RATE_RULES[path]
        ip = (request.headers.get("X-Forwarded-For") or
              (request.client.host if request.client else "unknown")).split(",")[0].strip()
        key = f"{path}:{ip}"
        now = time.monotonic()
        _rate_buckets[key] = [t for t in _rate_buckets[key] if now - t < window]
        if len(_rate_buckets[key]) >= limit:
            return JSONResponse(
                {"detail": "Too many attempts. Please wait and try again."},
                status_code=429,
                headers={"Retry-After": str(window)},
            )
        _rate_buckets[key].append(now)
    return await call_next(request)

# ── Register Routers ──────────────────────────────────────────

# All routers now using new modular structure
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(fetch_router, prefix="/api")
app.include_router(mastery_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
app.include_router(notebook_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(curriculum_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(squads_router, prefix="/api")
app.include_router(bhool_router, prefix="/api")
app.include_router(muqabla_router, prefix="/api")
app.include_router(parent_router, prefix="/api")
app.include_router(referrals_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(drishti_router, prefix="/api")

# ── Health Check ──────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Eduvy-AI Backend", "version": "3.0.0"}
