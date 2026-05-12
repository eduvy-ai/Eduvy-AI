import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

load_dotenv()

app = FastAPI(
    title="Eduvy-AI Backend",
    description="Secure AI proxy + data store for Eduvy-AI",
    version="2.0.0",
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
    allow_headers=["Content-Type"],
)

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


# ── Health check ──────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Eduvy-AI Backend", "version": "2.0.0"}
