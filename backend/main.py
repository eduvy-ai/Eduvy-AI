import os
import time
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from database import init_db
from routers.ai import router as ai_router
from routers.fetch import router as fetch_router
from routers.profile import router as profile_router
from routers.mastery import router as mastery_router
from routers.quiz_stats import router as quiz_router
from routers.notebook import router as notebook_router
from routers.sessions import router as sessions_router
from routers.auth import router as auth_router
from routers.curriculum import router as curriculum_router
from routers.admin import router as admin_router
from routers.squads import router as squads_router
from routers.bhool import router as bhool_router
from routers.muqabla import router as muqabla_router
from routers.parent import router as parent_router
from routers.payment import router as payment_router

load_dotenv()

# ── Warn if JWT secret is the insecure default ────────────────
import warnings
if os.getenv("JWT_SECRET", "eduvyai-change-me") == "eduvyai-change-me":
    warnings.warn(
        "JWT_SECRET is using the insecure default value. "
        "Set a strong random secret in your .env file before deploying to production.",
        stacklevel=2,
    )

app = FastAPI(
    title="Eduvy-AI Backend",
    description="Secure AI proxy + data store for Eduvy-AI",
    version="2.0.0",
    # Disable /docs and /redoc in production
    docs_url=None if os.getenv("ENV", "development") == "production" else "/docs",
    redoc_url=None if os.getenv("ENV", "development") == "production" else "/redoc",
    openapi_url=None if os.getenv("ENV", "development") == "production" else "/openapi.json",
)

# ── DB init on startup ────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

# ── CORS ──────────────────────────────────────────────────────
_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:4173"
)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],  # Authorization required for JWT
)

# ── Security headers middleware ───────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# ── In-memory rate limiter for auth endpoints ─────────────────
# Tracks request timestamps per IP. Sliding window.
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_RATE_RULES = {
    "/api/auth/login":    (10, 60),   # 10 requests per 60 s
    "/api/auth/register": (5,  60),   # 5 requests per 60 s
    "/api/admin/login":   (5,  60),   # 5 requests per 60 s
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

# ── Routers ───────────────────────────────────────────────────
app.include_router(ai_router, prefix="/api")
app.include_router(fetch_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(mastery_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
app.include_router(notebook_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(curriculum_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(squads_router, prefix="/api")
app.include_router(bhool_router, prefix="/api")
app.include_router(muqabla_router, prefix="/api")
app.include_router(parent_router, prefix="/api")
app.include_router(payment_router, prefix="/api")


# ── Health check ──────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Eduvy-AI Backend", "version": "2.0.0"}
