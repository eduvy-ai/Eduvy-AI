"""
Admin Router - API endpoints for admin panel.
"""
import asyncio
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.modules.admin.schemas import (
    AdminLoginRequest, AdminSetupRequest,
    BoardUpsert, StandardUpsert, MediumUpsert,
    CurriculumRow, CurriculumUpdate, CurriculumImport,
    UserPlanUpdate, UserAIConfig, CreateDrishtiStudent,
    AIRoutingUpdate, AIKeyUpsert,
    HelperCreate, HelperUpdate,
)
from app.modules.admin.service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])

_bearer = HTTPBearer(auto_error=False)
_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def get_admin_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    """Verify admin JWT token."""
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


# ── Boards ────────────────────────────────────────────────────

@router.get("/boards")
async def list_boards(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.list_boards)


@router.post("/boards", status_code=201)
async def create_board(data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.upsert_board, data.id, data.name, data.sort_order, data.is_active
    )


@router.put("/boards/{board_id}")
async def update_board(board_id: str, data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.upsert_board, board_id, data.name, data.sort_order, data.is_active
    )


@router.delete("/boards/{board_id}")
async def delete_board(board_id: str, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.delete_board, board_id)


@router.post("/boards/import")
async def import_boards(rows: list, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.import_boards, rows)


# ── Standards ─────────────────────────────────────────────────

@router.get("/standards")
async def list_standards(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.list_standards)


@router.post("/standards", status_code=201)
async def create_standard(data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.upsert_standard, data.id, data.name, data.grade_num, data.sort_order, data.is_active
    )


@router.put("/standards/{std_id}")
async def update_standard(std_id: str, data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.upsert_standard, std_id, data.name, data.grade_num, data.sort_order, data.is_active
    )


@router.delete("/standards/{std_id}")
async def delete_standard(std_id: str, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.delete_standard, std_id)


@router.post("/standards/import")
async def import_standards(rows: list, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.import_standards, rows)


# ── Mediums ───────────────────────────────────────────────────

@router.get("/mediums")
async def list_mediums(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.list_mediums)


@router.post("/mediums", status_code=201)
async def create_medium(data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.upsert_medium, data.id, data.name, data.sort_order, data.is_active
    )


@router.put("/mediums/{med_id}")
async def update_medium(med_id: str, data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.upsert_medium, med_id, data.name, data.sort_order, data.is_active
    )


@router.delete("/mediums/{med_id}")
async def delete_medium(med_id: str, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.delete_medium, med_id)


@router.post("/mediums/import")
async def import_mediums(rows: list, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.import_mediums, rows)


# ── Curriculum ────────────────────────────────────────────────

@router.get("/curriculum")
async def list_curriculum(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.list_curriculum)


@router.post("/curriculum", status_code=201)
async def create_curriculum(data: CurriculumRow, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.create_curriculum,
        data.board_id, data.standard_id, data.medium_id, data.subjects, data.is_active
    )


@router.put("/curriculum/{row_id}")
async def update_curriculum(row_id: int, data: CurriculumUpdate, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.update_curriculum, row_id, data.subjects, data.is_active
    )


@router.delete("/curriculum/{row_id}")
async def delete_curriculum(row_id: int, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.delete_curriculum, row_id)


@router.post("/curriculum/import")
async def import_curriculum(data: CurriculumImport, admin_id: int = Depends(get_admin_user)):
    rows = [r.model_dump() for r in data.rows]
    return await asyncio.to_thread(AdminService.import_curriculum, rows)


# ── Users ─────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    search: str = Query(""),
    plan: str = Query(""),
    drishti: str = Query(""),
    admin_id: int = Depends(get_admin_user),
):
    drishti_only = drishti.lower() in ("true", "1", "yes")
    return await asyncio.to_thread(AdminService.list_users, search, plan, drishti_only)


@router.put("/users/{user_id}/plan")
async def update_user_plan(user_id: str, data: UserPlanUpdate, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.update_user_plan, user_id, data.plan, data.plan_expires_at
    )


@router.put("/users/{user_id}/drishti")
async def toggle_drishti(
    user_id: str,
    is_drishti: bool = Query(...),
    admin_id: int = Depends(get_admin_user),
):
    return await asyncio.to_thread(AdminService.toggle_drishti, user_id, is_drishti)


@router.put("/users/{user_id}/ai-config")
async def update_user_ai_config(user_id: str, data: UserAIConfig, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.update_user_ai_config, user_id, data.provider, data.model, data.override
    )


@router.post("/users/drishti", status_code=201)
async def create_drishti_student(data: CreateDrishtiStudent, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.create_drishti_student,
        data.name, data.email, data.password, data.standard, data.board, data.language
    )


# ── AI Usage ──────────────────────────────────────────────────

@router.get("/usage/summary")
async def usage_summary(days: int = Query(7), admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.get_usage_summary, days)


@router.get("/usage/users")
async def usage_by_date(date: str = Query(...), admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.get_usage_by_date, date)


# ── AI Config ─────────────────────────────────────────────────

@router.get("/ai-config")
async def get_ai_config(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.get_ai_config)


@router.put("/ai-config")
async def save_ai_routing(data: AIRoutingUpdate, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.save_ai_routing, data.plan, data.provider, data.model
    )


@router.put("/ai-keys")
async def save_ai_key(data: AIKeyUpsert, admin_id: int = Depends(get_admin_user)):
    if not data.key.strip():
        raise HTTPException(status_code=400, detail="Key cannot be empty")
    return await asyncio.to_thread(AdminService.save_ai_key, data.provider, data.key.strip(), data.slot)


@router.delete("/ai-keys/{provider}/{slot}")
async def remove_ai_key(provider: str, slot: int, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.remove_ai_key, provider, slot)


# ── Drishti Helpers ───────────────────────────────────────────

@router.get("/drishti-helpers")
async def list_helpers(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.list_helpers)


@router.post("/drishti-helpers", status_code=201)
async def create_helper(data: HelperCreate, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.create_helper,
        data.helper_name, data.helper_email, data.helper_type, data.notes
    )


@router.put("/drishti-helpers/{helper_id}")
async def update_helper(helper_id: int, data: HelperUpdate, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(
        AdminService.update_helper,
        helper_id, data.helper_name, data.helper_email, data.helper_type, data.notes
    )


@router.delete("/drishti-helpers/{helper_id}")
async def deactivate_helper(helper_id: int, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.deactivate_helper, helper_id)


@router.get("/drishti-helpers/{helper_id}/students")
async def get_helper_students(helper_id: int, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.get_helper_students, helper_id)


@router.post("/drishti-helpers/{helper_id}/assign/{student_id}")
async def assign_student(helper_id: int, student_id: str, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.assign_student, helper_id, student_id)


@router.delete("/drishti-helpers/{helper_id}/assign/{student_id}")
async def unassign_student(helper_id: int, student_id: str, admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.unassign_student, helper_id, student_id)


@router.get("/drishti-students")
async def list_drishti_students(admin_id: int = Depends(get_admin_user)):
    return await asyncio.to_thread(AdminService.list_drishti_students)


