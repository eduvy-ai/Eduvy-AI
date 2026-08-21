"""
Admin Router - API endpoints for admin panel.
"""
import asyncio
import os
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.modules.admin.schemas import (
    AdminLoginRequest, AdminSetupRequest, ChangePasswordRequest,
    BoardUpsert, StandardUpsert, MediumUpsert, SubjectUpsert,
    CurriculumRow, CurriculumUpdate, CurriculumImport,
    ChapterCreate, ChapterUpdate, ChapterBulkCreate,
    UserPlanUpdate, UserAIConfig, CreateDrishtiStudent,
    StudentCreate, StudentUpdate, BulkImportRequest,
    AIRoutingUpdate, AIKeyUpsert, AIKeyEnhanced, AIKeyValidate, AIKeyToggle, AIKeyMetadataUpdate,
    HelperCreate, HelperUpdate,
    BulkDeleteStr, BulkDeleteInt,
    SquadCreate, SquadUpdate,
    SchoolTeacherCreate, SchoolTeacherUpdate,
    QuestionCreate, QuestionUpdate, QuestionBulkCreate,
    MediaCreate, MediaUpdate,
    AIPromptCreate, AIPromptUpdate, AIPromptSeed,
)
from app.modules.admin.service import AdminService
from app.utils.email import send_email

router = APIRouter(prefix="/admin", tags=["Admin"])

_bearer = HTTPBearer(auto_error=False)
_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_admin_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    """Verify admin JWT token and return admin_id."""
    if not creds:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access only")
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(uid)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


def get_admin_with_school(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> tuple:
    """Verify admin JWT token and return (admin_id, school_id) tuple.
    school_id is None for superadmin, integer for school admin."""
    if not creds:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access only")
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        school_id = payload.get("school_id")  # None for superadmin
        return (int(uid), school_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ── Auth endpoints ────────────────────────────────────────────

@router.post("/setup", status_code=201)
async def admin_setup(data: AdminSetupRequest):
    """Create first superadmin."""
    return await asyncio.to_thread(AdminService.setup, data.email, data.password, data.name)


@router.post("/login")
async def admin_login(data: AdminLoginRequest):
    """Admin login."""
    return await asyncio.to_thread(AdminService.login, data.email, data.password)


@router.get("/me")
async def admin_me(admin_id: int = Depends(get_admin_user)):
    """Get admin profile."""
    return await asyncio.to_thread(AdminService.get_me, admin_id)


@router.post("/test-email")
async def test_email(to: str = Query(...), admin_id: int = Depends(get_admin_user)):
    """Send a test email to verify SMTP configuration."""
    html = """
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #10b981;">✅ Eduvy-AI Email Test</h2>
        <p>If you're reading this, your SMTP configuration is working correctly!</p>
        <p style="color: #6b7280; font-size: 14px;">Sent from Eduvy-AI Admin Panel</p>
    </div>
    """
    success = await send_email(
        to_email=to,
        subject="Eduvy-AI Email Test ✅",
        html_body=html,
        plain_body="Eduvy-AI Email Test - Your SMTP configuration is working!",
    )
    if success:
        return {"status": "sent", "to": to}
    raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP config.")


@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, admin_id: int = Depends(get_admin_user)):
    """Change admin password (required on first login for school admins)."""
    return await asyncio.to_thread(AdminService.change_password, admin_id, data.new_password)


# ── Boards ────────────────────────────────────────────────────

@router.get("/boards")
async def list_boards(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.list_boards, school_id)


@router.post("/boards", status_code=201)
async def create_board(data: BoardUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_board, data.id, data.name, data.sort_order, data.is_active, school_id
    )


@router.put("/boards/{board_id}")
async def update_board(board_id: str, data: BoardUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_board, board_id, data.name, data.sort_order, data.is_active, school_id
    )


@router.delete("/boards/{board_id}")
async def delete_board(board_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_board, board_id, school_id)


@router.post("/boards/import")
async def import_boards(rows: list = Body(...), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.import_boards, rows, school_id)


@router.post("/boards/bulk-delete")
async def bulk_delete_boards(data: BulkDeleteStr, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_boards, data.ids, school_id)


# ── Standards ─────────────────────────────────────────────────

@router.get("/standards")
async def list_standards(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.list_standards, school_id)


@router.post("/standards", status_code=201)
async def create_standard(data: StandardUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_standard, data.id, data.name, data.grade_num, data.sort_order, data.is_active, school_id
    )


@router.put("/standards/{std_id}")
async def update_standard(std_id: str, data: StandardUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_standard, std_id, data.name, data.grade_num, data.sort_order, data.is_active, school_id
    )


@router.delete("/standards/{std_id}")
async def delete_standard(std_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_standard, std_id, school_id)


@router.post("/standards/import")
async def import_standards(rows: list = Body(...), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.import_standards, rows, school_id)


@router.post("/standards/bulk-delete")
async def bulk_delete_standards(data: BulkDeleteStr, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_standards, data.ids, school_id)


# ── Mediums ───────────────────────────────────────────────────

@router.get("/mediums")
async def list_mediums(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.list_mediums, school_id)


@router.post("/mediums", status_code=201)
async def create_medium(data: MediumUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_medium, data.id, data.name, data.sort_order, data.is_active, school_id
    )


@router.put("/mediums/{med_id}")
async def update_medium(med_id: str, data: MediumUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_medium, med_id, data.name, data.sort_order, data.is_active, school_id
    )


@router.delete("/mediums/{med_id}")
async def delete_medium(med_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_medium, med_id, school_id)


@router.post("/mediums/import")
async def import_mediums(rows: list = Body(...), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.import_mediums, rows, school_id)


@router.post("/mediums/bulk-delete")
async def bulk_delete_mediums(data: BulkDeleteStr, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_mediums, data.ids, school_id)


# ── Streams (read-only, global) ────────────────────────────────

@router.get("/streams")
async def list_streams():
    """Get all active streams (Science, Commerce, Arts for Class 11-12)."""
    from app.modules.curriculum.service import CurriculumService
    return await asyncio.to_thread(CurriculumService.list_streams)


# ── Subjects ──────────────────────────────────────────────────

@router.get("/subjects")
async def list_subjects(
    board_id: str = Query(None),
    standard_id: str = Query(None),
    stream_id: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.list_subjects, board_id, standard_id, stream_id, school_id, page, page_size, search)


@router.post("/subjects", status_code=201)
async def create_subject(data: SubjectUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_subject, data.id, data.name, data.board_id, data.standard_id, data.stream_id, data.sort_order, data.is_active, school_id
    )


@router.put("/subjects/{subj_id}")
async def update_subject(subj_id: str, data: SubjectUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.upsert_subject, subj_id, data.name, data.board_id, data.standard_id, data.stream_id, data.sort_order, data.is_active, school_id
    )


@router.delete("/subjects/{subj_id}")
async def delete_subject(subj_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_subject, subj_id, school_id)


@router.post("/subjects/import")
async def import_subjects(rows: list = Body(...), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.import_subjects, rows, school_id)


@router.post("/subjects/bulk-delete")
async def bulk_delete_subjects(data: BulkDeleteStr, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_subjects, data.ids, school_id)


# ── Curriculum (deprecated) ───────────────────────────────────

@router.get("/curriculum")
async def list_curriculum(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.list_curriculum, school_id)


@router.post("/curriculum", status_code=201)
async def create_curriculum(data: CurriculumRow, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.create_curriculum,
        data.board_id, data.standard_id, data.medium_id, data.subjects, data.is_active, school_id
    )


@router.put("/curriculum/{row_id}")
async def update_curriculum(row_id: int, data: CurriculumUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_curriculum, row_id, data.subjects, data.is_active, school_id
    )


@router.delete("/curriculum/{row_id}")
async def delete_curriculum(row_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_curriculum, row_id, school_id)


@router.post("/curriculum/import")
async def import_curriculum(data: CurriculumImport, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    rows = [r.model_dump() for r in data.rows]
    return await asyncio.to_thread(AdminService.import_curriculum, rows, school_id)


@router.post("/curriculum/bulk-delete")
async def bulk_delete_curriculum(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_curriculum, data.ids, school_id)


@router.post("/curriculum/import-global")
async def import_global_curriculum(admin_scope: tuple = Depends(get_admin_with_school)):
    """Import global curriculum template to school (school admins only)."""
    admin_id, school_id = admin_scope
    if school_id is None:
        raise HTTPException(status_code=400, detail="Only school admins can import global curriculum")
    return await asyncio.to_thread(AdminService.import_global_curriculum, school_id)


# ── Chapters ──────────────────────────────────────────────────

@router.get("/chapters")
async def list_chapters(
    board_id: str = Query(None),
    standard_id: str = Query(None),
    subject_id: str = Query(None),
    is_active: bool = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.list_chapters_admin, board_id, standard_id, subject_id, is_active, school_id, page, page_size
    )


@router.get("/chapters/{chapter_id}")
async def get_chapter(chapter_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_chapter_admin, chapter_id, school_id)


@router.post("/chapters", status_code=201)
async def create_chapter(data: ChapterCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.create_chapter_admin,
        data.board_id, data.standard_id, data.subject_id, data.chapter_number,
        data.chapter_name, data.chapter_name_local, data.description,
        data.topics, data.content_status, data.is_active, school_id
    )


@router.put("/chapters/{chapter_id}")
async def update_chapter(chapter_id: int, data: ChapterUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_chapter_admin,
        chapter_id, data.chapter_name, data.chapter_name_local,
        data.description, data.topics, data.content_status, data.is_active, school_id
    )


@router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_chapter_admin, chapter_id, school_id)


@router.post("/chapters/bulk", status_code=201)
async def bulk_create_chapters(data: ChapterBulkCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    chapters = [ch.model_dump() for ch in data.chapters]
    return await asyncio.to_thread(AdminService.bulk_create_chapters_admin, chapters, school_id)


@router.post("/chapters/bulk-delete")
async def bulk_delete_chapters(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_chapters_admin, data.ids, school_id)


# ── Users ─────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    search: str = Query(""),
    plan: str = Query(""),
    drishti: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    admin_id, school_id = admin_scope
    drishti_only = drishti.lower() in ("true", "1", "yes")
    return await asyncio.to_thread(AdminService.list_users, search, plan, drishti_only, school_id, page, page_size)


@router.put("/users/{user_id}/plan")
async def update_user_plan(user_id: str, data: UserPlanUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_user_plan, user_id, data.plan, data.plan_expires_at, school_id
    )


@router.put("/users/{user_id}/drishti")
async def toggle_drishti(
    user_id: str,
    is_drishti: bool = Query(...),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.toggle_drishti, user_id, is_drishti, school_id)


@router.put("/users/{user_id}/ai-config")
async def update_user_ai_config(user_id: str, data: UserAIConfig, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_user_ai_config, user_id, data.provider, data.model, data.override, school_id
    )


@router.post("/users/drishti", status_code=201)
async def create_drishti_student(data: CreateDrishtiStudent, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.create_drishti_student,
        data.name, data.email, data.password, data.standard, data.board, data.language, school_id
    )


@router.post("/users", status_code=201)
async def create_student(data: StudentCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    """Create a student. School admins auto-assign their school_id."""
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.create_student,
        data.name, data.email, data.password, data.standard, data.board, data.stream, data.language, data.plan, school_id, data.send_email
    )


@router.put("/users/{user_id}")
async def update_student(user_id: str, data: StudentUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    """Update a student. School admins can only update their school's students."""
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_student,
        user_id, data.name, data.email, data.standard, data.board, data.stream, data.language, 
        data.plan, data.plan_expires_at, data.is_drishti, data.is_suspended, school_id
    )


@router.post("/users/bulk-delete")
async def bulk_delete_users(data: BulkDeleteStr, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_users, data.ids, school_id)


@router.post("/users/bulk-import")
async def bulk_import_students(data: BulkImportRequest, admin_scope: tuple = Depends(get_admin_with_school)):
    """Bulk import students from a list. Each student gets a temp password and welcome email."""
    admin_id, school_id = admin_scope
    students_data = [s.model_dump() for s in data.students]
    return await asyncio.to_thread(
        AdminService.bulk_import_students,
        students_data, school_id, data.send_email
    )


# ── API / Model Dashboard ─────────────────────────────────────

@router.get("/api-dashboard")
async def get_api_dashboard(
    from_date: str = Query(None),
    to_date: str = Query(None),
    admin_scope: tuple = Depends(get_admin_with_school)
):
    """Live provider pool status, plan routing, and usage per provider for a date range."""
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_api_dashboard, from_date, to_date, school_id)


# ── AI Usage ──────────────────────────────────────────────────

@router.get("/usage/summary")
async def usage_summary(days: int = Query(7), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_usage_summary, days, school_id)


@router.get("/usage/users")
async def usage_by_users(days: int = Query(7), admin_scope: tuple = Depends(get_admin_with_school)):
    """Get top users by AI usage for the past N days."""
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_usage_by_users, days, school_id)


# ── AI Config ─────────────────────────────────────────────────
# AI config endpoints are SUPERADMIN ONLY (school admins cannot modify global AI settings)

@router.get("/ai-config")
async def get_ai_config(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    return await asyncio.to_thread(AdminService.get_ai_config)


@router.get("/ai-models/{provider}")
async def get_provider_models(provider: str, admin_scope: tuple = Depends(get_admin_with_school)):
    """Return live model list for a provider using its configured server key."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    allowed = {"groq", "gemini", "anthropic", "openai", "nvidia"}
    if provider not in allowed:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    models = await AdminService.fetch_provider_models(provider)
    return {"provider": provider, "models": models}


@router.put("/ai-config")
async def save_ai_routing(data: AIRoutingUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    return await asyncio.to_thread(
        AdminService.save_ai_routing, data.plan, data.provider, data.model
    )


@router.put("/ai-keys")
async def save_ai_key(data: AIKeyUpsert, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    if not data.key.strip():
        raise HTTPException(status_code=400, detail="Key cannot be empty")
    return await asyncio.to_thread(AdminService.save_ai_key, data.provider, data.key.strip(), data.slot)


@router.delete("/ai-keys/{provider}/{slot}")
async def remove_ai_key(provider: str, slot: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    return await asyncio.to_thread(AdminService.remove_ai_key, provider, slot)


# ── Enhanced AI Key Management ────────────────────────────────

@router.post("/ai-keys/validate")
async def validate_ai_key(data: AIKeyValidate, admin_scope: tuple = Depends(get_admin_with_school)):
    """Validate an API key and return available models."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    
    from services.ai_service import validate_and_list_models, cache_provider_models
    result = await validate_and_list_models(data.provider, data.key)
    
    # Cache models if validation succeeded
    if result["valid"] and result["models"]:
        await asyncio.to_thread(cache_provider_models, data.provider, result["models"])
    
    return result


@router.post("/ai-keys/{provider}/{slot}/validate")
async def validate_existing_ai_key(provider: str, slot: int, admin_scope: tuple = Depends(get_admin_with_school)):
    """Validate an existing API key by provider+slot (fetches from DB)."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    
    from services.ai_service import validate_existing_key, cache_provider_models
    result = await validate_existing_key(provider, slot)
    
    # Cache models if validation succeeded
    if result["valid"] and result.get("models"):
        await asyncio.to_thread(cache_provider_models, provider, result["models"])
    
    return result


@router.get("/ai-keys/enhanced")
async def get_ai_keys_enhanced(admin_scope: tuple = Depends(get_admin_with_school)):
    """Get all API keys with enhanced metadata."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    
    from services.ai_service import get_provider_keys_enhanced
    keys = await asyncio.to_thread(get_provider_keys_enhanced, None)
    return {"keys": keys}


@router.put("/ai-keys/enhanced")
async def save_ai_key_enhanced(data: AIKeyEnhanced, admin_scope: tuple = Depends(get_admin_with_school)):
    """Save API key with metadata to enhanced table."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    if not data.key.strip():
        raise HTTPException(status_code=400, detail="Key cannot be empty")
    
    from services.ai_service import save_api_key_enhanced
    result = await asyncio.to_thread(
        save_api_key_enhanced,
        data.provider,
        data.key.strip(),
        data.slot,
        data.owner_email,
        data.project_name,
        data.description,
        data.rpm_limit,
        data.tpm_limit,
        data.daily_limit,
        admin_id,
    )
    return result


@router.put("/ai-keys/{provider}/{slot}/toggle")
async def toggle_ai_key(provider: str, slot: int, data: AIKeyToggle, admin_scope: tuple = Depends(get_admin_with_school)):
    """Enable or disable an API key without deleting it."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    
    from services.ai_service import toggle_key_enabled
    success = await asyncio.to_thread(toggle_key_enabled, provider, slot, data.enabled)
    if success:
        return {"success": True, "provider": provider, "slot": slot, "enabled": data.enabled}
    raise HTTPException(status_code=500, detail="Failed to toggle key status")


@router.patch("/ai-keys/{provider}/{slot}/metadata")
async def update_ai_key_metadata(
    provider: str, 
    slot: int, 
    data: AIKeyMetadataUpdate, 
    admin_scope: tuple = Depends(get_admin_with_school)
):
    """Update key metadata without changing the key itself."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    
    from services.ai_service import update_key_metadata
    success = await asyncio.to_thread(
        update_key_metadata,
        provider,
        slot,
        data.owner_email,
        data.project_name,
        data.description,
        data.rpm_limit,
        data.tpm_limit,
        data.daily_limit,
    )
    if success:
        return {"success": True, "provider": provider, "slot": slot}
    raise HTTPException(status_code=404, detail="Key not found")


@router.get("/ai-keys/models")
async def get_cached_provider_models(provider: str = None, admin_scope: tuple = Depends(get_admin_with_school)):
    """Get cached models for a provider (or all providers)."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="AI configuration is superadmin only")
    
    from services.ai_service import get_cached_models
    models = await asyncio.to_thread(get_cached_models, provider)
    return {"models": models}


# ── Drishti Helpers ───────────────────────────────────────────
# Drishti is a superadmin-only feature

def _require_superadmin(school_id):
    """Raise 403 if not superadmin."""
    if school_id is not None:
        raise HTTPException(status_code=403, detail="This feature is superadmin only")

@router.get("/drishti-helpers")
async def list_helpers(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.list_helpers)


@router.post("/drishti-helpers", status_code=201)
async def create_helper(data: HelperCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(
        AdminService.create_helper,
        data.helper_name, data.helper_email, data.helper_type, data.notes
    )


@router.put("/drishti-helpers/{helper_id}")
async def update_helper(helper_id: int, data: HelperUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(
        AdminService.update_helper,
        helper_id, data.helper_name, data.helper_email, data.helper_type, data.notes
    )


@router.delete("/drishti-helpers/{helper_id}")
async def deactivate_helper(helper_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.deactivate_helper, helper_id)


@router.get("/drishti-helpers/{helper_id}/students")
async def get_helper_students(helper_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.get_helper_students, helper_id)


@router.post("/drishti-helpers/{helper_id}/assign/{student_id}")
async def assign_student(helper_id: int, student_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.assign_student, helper_id, student_id)


@router.delete("/drishti-helpers/{helper_id}/assign/{student_id}")
async def unassign_student(helper_id: int, student_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.unassign_student, helper_id, student_id)


@router.delete("/drishti-helpers/{helper_id}/permanent")
async def delete_helper_permanent(helper_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.delete_helper_permanent, helper_id)


@router.post("/drishti-helpers/bulk-delete")
async def bulk_delete_helpers(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.bulk_delete_helpers, data.ids)


@router.get("/drishti-students")
async def list_drishti_students(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.list_drishti_students)


# ── Community / Squads ────────────────────────────────────────
# Community management is superadmin only

@router.get("/community/stats")
async def get_community_stats(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.get_community_stats)


@router.get("/squads")
async def list_squads(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.list_squads, page, page_size, search)


@router.get("/squads/{squad_id}")
async def get_squad(squad_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.get_squad, squad_id)


@router.post("/squads", status_code=201)
async def create_squad(data: SquadCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.create_squad, data.name, data.focus_subject, data.standard, data.medium)


@router.put("/squads/{squad_id}")
async def update_squad(squad_id: int, data: SquadUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.update_squad, squad_id, data.name, data.focus_subject, data.standard, data.medium, data.is_active)


@router.delete("/squads/{squad_id}")
async def delete_squad(squad_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.delete_squad, squad_id)


@router.post("/squads/bulk-delete")
async def bulk_delete_squads(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.bulk_delete_squads, data.ids)


@router.get("/squads/{squad_id}/members")
async def get_squad_members(squad_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.get_squad_members, squad_id)


@router.delete("/squads/{squad_id}/members/{user_id}")
async def remove_squad_member(squad_id: int, user_id: str, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.remove_squad_member, squad_id, user_id)


@router.get("/squads/{squad_id}/messages")
async def get_squad_messages(squad_id: int, limit: int = Query(default=100), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.get_squad_messages, squad_id, limit)


@router.delete("/squad-messages/{message_id}")
async def delete_squad_message(message_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.delete_squad_message, message_id)


@router.get("/doubts")
async def list_doubts(squad_id: int = Query(default=None), limit: int = Query(default=100), admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.get_squad_doubts, squad_id, limit)


@router.delete("/doubts/{doubt_id}")
async def delete_doubt(doubt_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.delete_squad_doubt, doubt_id)


@router.post("/doubts/bulk-delete")
async def bulk_delete_doubts(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)
    return await asyncio.to_thread(AdminService.bulk_delete_doubts, data.ids)


# ── Analytics ─────────────────────────────────────────────────

@router.get("/analytics/overview")
async def get_analytics_overview(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_analytics_overview, school_id)


@router.get("/analytics/students")
async def get_analytics_students(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_analytics_students, school_id)


@router.get("/analytics/revenue")
async def get_analytics_revenue(admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    _require_superadmin(school_id)  # Revenue analytics is superadmin only
    return await asyncio.to_thread(AdminService.get_analytics_revenue)


# ── School Teachers (B2B) ─────────────────────────────────────
# School admins can manage their own teachers

@router.get("/teachers")
async def list_school_teachers(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.list_school_teachers, school_id, page, page_size, search)


@router.post("/teachers", status_code=201)
async def create_school_teacher(data: SchoolTeacherCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    if school_id is None:
        raise HTTPException(status_code=400, detail="Superadmin cannot create school teachers. Use Drishti helpers instead.")
    return await asyncio.to_thread(
        AdminService.create_school_teacher,
        data.name, data.email, data.phone, data.subjects, data.standards, data.notes, school_id
    )


@router.put("/teachers/{teacher_id}")
async def update_school_teacher(teacher_id: int, data: SchoolTeacherUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_school_teacher,
        teacher_id, data.name, data.email, data.phone, data.subjects, data.standards, data.notes, data.is_active, school_id
    )


@router.delete("/teachers/{teacher_id}")
async def delete_school_teacher(teacher_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_school_teacher, teacher_id, school_id)


@router.post("/teachers/bulk-delete")
async def bulk_delete_school_teachers(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_school_teachers, data.ids, school_id)


# ── Questions (B2B) ───────────────────────────────────────────
# School admins can manage their own question bank

@router.get("/questions")
async def list_questions(
    chapter_id: int = Query(None),
    type: str = Query(None),
    difficulty: str = Query(None),
    search: str = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    admin_scope: tuple = Depends(get_admin_with_school)
):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.list_questions, chapter_id, type, difficulty, search, limit, offset, school_id
    )


@router.get("/questions/{question_id}")
async def get_question(question_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_question, question_id, school_id)


@router.post("/questions", status_code=201)
async def create_question(data: QuestionCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.create_question,
        data.chapter_id, data.type, data.difficulty, data.question,
        data.options, data.correct_answer, data.explanation, data.tags, str(admin_id), school_id
    )


@router.put("/questions/{question_id}")
async def update_question(question_id: int, data: QuestionUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_question,
        question_id, data.type, data.difficulty, data.question,
        data.options, data.correct_answer, data.explanation, data.tags, data.is_active, school_id
    )


@router.delete("/questions/{question_id}")
async def delete_question(question_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_question, question_id, school_id)


@router.post("/questions/bulk", status_code=201)
async def bulk_create_questions(data: QuestionBulkCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    created = 0
    for q in data.questions:
        try:
            await asyncio.to_thread(
                AdminService.create_question,
                q.chapter_id, q.type, q.difficulty, q.question,
                q.options, q.correct_answer, q.explanation, q.tags, str(admin_id), school_id
            )
            created += 1
        except Exception:
            pass
    return {"created": created}


@router.post("/questions/bulk-delete")
async def bulk_delete_questions(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_questions, data.ids, school_id)


# ── Media (B2B) ───────────────────────────────────────────────
# School admins can manage their own media library

@router.get("/media")
async def list_media(
    type: str = Query(None),
    chapter_id: int = Query(None),
    subject_id: str = Query(None),
    search: str = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    admin_scope: tuple = Depends(get_admin_with_school)
):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.list_media, type, chapter_id, subject_id, search, limit, offset, school_id
    )


@router.get("/media/{media_id}")
async def get_media(media_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.get_media, media_id, school_id)


@router.post("/media", status_code=201)
async def create_media(data: MediaCreate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.create_media,
        data.name, data.type, data.url, data.thumbnail_url, data.size_bytes,
        data.duration_sec, data.dimensions, data.subject_id, data.chapter_id, str(admin_id), school_id
    )


@router.put("/media/{media_id}")
async def update_media(media_id: int, data: MediaUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(
        AdminService.update_media, media_id, data.name, data.subject_id, data.chapter_id, data.is_active, school_id
    )


@router.delete("/media/{media_id}")
async def delete_media(media_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.delete_media, media_id, school_id)


@router.post("/media/bulk-delete")
async def bulk_delete_media(data: BulkDeleteInt, admin_scope: tuple = Depends(get_admin_with_school)):
    admin_id, school_id = admin_scope
    return await asyncio.to_thread(AdminService.bulk_delete_media, data.ids, school_id)


# ── AI Prompts ────────────────────────────────────────────────

@router.get("/prompts")
async def list_prompts(
    category: str = Query(None),
    search: str = Query(None),
    include_inactive: bool = Query(False),
    admin_id: int = Depends(get_admin_user)
):
    """List all AI prompts with optional filters."""
    return await asyncio.to_thread(AdminService.list_prompts, category, search, include_inactive)


@router.get("/prompts/{prompt_id}")
async def get_prompt(prompt_id: int, admin_id: int = Depends(get_admin_user)):
    """Get a single AI prompt by ID."""
    return await asyncio.to_thread(AdminService.get_prompt, prompt_id)


@router.post("/prompts", status_code=201)
async def create_prompt(data: AIPromptCreate, admin_id: int = Depends(get_admin_user)):
    """Create a new AI prompt."""
    return await asyncio.to_thread(
        AdminService.create_prompt,
        data.key, data.name, data.description, data.category, data.template,
        data.variables, data.model, data.max_tokens, data.temperature, data.is_active, admin_id
    )


@router.put("/prompts/{prompt_id}")
async def update_prompt(prompt_id: int, data: AIPromptUpdate, admin_id: int = Depends(get_admin_user)):
    """Update an AI prompt."""
    return await asyncio.to_thread(
        AdminService.update_prompt,
        prompt_id, data.name, data.description, data.category, data.template,
        data.variables, data.model, data.max_tokens, data.temperature, data.is_active, admin_id
    )


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int, admin_id: int = Depends(get_admin_user)):
    """Delete an AI prompt (soft delete)."""
    return await asyncio.to_thread(AdminService.delete_prompt, prompt_id)


@router.delete("/prompts/{prompt_id}/hard")
async def hard_delete_prompt(prompt_id: int, admin_id: int = Depends(get_admin_user)):
    """Permanently delete an AI prompt."""
    return await asyncio.to_thread(AdminService.hard_delete_prompt, prompt_id)


@router.post("/prompts/seed")
async def seed_prompts(data: AIPromptSeed, admin_id: int = Depends(get_admin_user)):
    """Seed prompts from hardcoded MODE_INSTRUCTIONS."""
    return await asyncio.to_thread(AdminService.seed_prompts_from_hardcoded, data.overwrite, admin_id)
