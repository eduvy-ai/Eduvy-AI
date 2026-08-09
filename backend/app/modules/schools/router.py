"""
Schools Router - API endpoints for B2B school management.
"""
import asyncio
import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.modules.schools.schemas import (
    SchoolCreate, SchoolUpdate, SchoolResponse, SchoolListResponse,
    StudentImportRequest, StudentImportResult,
    JoinSchoolRequest, JoinSchoolResponse,
    SchoolAnalytics, SchoolUpgradeRequest,
)
from app.modules.schools.service import SchoolsService

router = APIRouter(prefix="/schools", tags=["Schools"])

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


def get_admin_with_school(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> tuple[int, int | None]:
    """
    Verify admin JWT token and extract school_id.
    Returns (admin_id, school_id) where school_id is None for superadmins.
    """
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
        return int(uid), school_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


def verify_school_access(school_id: int, admin_school_id: int | None):
    """Verify that admin can access this school. Raises 403 if not allowed."""
    if admin_school_id is not None and admin_school_id != school_id:
        raise HTTPException(status_code=403, detail="Access denied: You can only access your own school")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    """Verify student JWT token."""
    if not creds:
        raise HTTPException(status_code=401, detail="Auth required")
    try:
        payload = jwt.decode(creds.credentials, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
        return uid
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ── Admin Endpoints (CRUD) ────────────────────────────────────

@router.post("", response_model=SchoolResponse, status_code=201)
async def create_school(
    data: SchoolCreate,
    background_tasks: BackgroundTasks,
    admin_scope: tuple = Depends(get_admin_with_school),
):
    """Create a new school (superadmin only)."""
    import logging
    logger = logging.getLogger(__name__)
    
    admin_id, school_id = admin_scope
    if school_id is not None:
        raise HTTPException(status_code=403, detail="Only superadmin can create schools")
    result = await asyncio.to_thread(SchoolsService.create_school, data.model_dump())
    
    logger.info(f"School created: {result.get('name')}, admin_created: {result.get('admin_created')}, has_email_data: {'_email_data' in result}")
    
    # Send welcome email in background if admin was created
    if result.get("_email_data"):
        email_data = result.pop("_email_data")
        logger.info(f"Scheduling welcome email to: {email_data['email']}")
        background_tasks.add_task(
            SchoolsService.send_admin_welcome_email_sync,
            email_data["email"],
            email_data["school_name"],
            email_data["password"],
        )
    else:
        logger.info("No _email_data in result - admin may already exist or no contact_email provided")
    
    return result


@router.get("", response_model=SchoolListResponse)
async def list_schools(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: str = Query("", max_length=100),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    """List schools. School admins see only their school."""
    admin_id, school_id = admin_scope
    if school_id is not None:
        # School admin: return only their school
        school = await asyncio.to_thread(SchoolsService.get_school, school_id)
        return {"schools": [school], "total": 1}
    return await asyncio.to_thread(SchoolsService.list_schools, limit, offset, search)


@router.get("/plans")
async def get_school_plans():
    """Get available school plans (public)."""
    return SchoolsService.get_school_plans()


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(school_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    """Get school details."""
    admin_id, admin_school_id = admin_scope
    verify_school_access(school_id, admin_school_id)
    return await asyncio.to_thread(SchoolsService.get_school, school_id)


@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(school_id: int, data: SchoolUpdate, admin_scope: tuple = Depends(get_admin_with_school)):
    """Update school details (superadmin only)."""
    admin_id, admin_school_id = admin_scope
    if admin_school_id is not None:
        raise HTTPException(status_code=403, detail="Only superadmin can update school settings")
    return await asyncio.to_thread(SchoolsService.update_school, school_id, data.model_dump(exclude_none=True))


@router.delete("/{school_id}")
async def delete_school(school_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    """Delete school (superadmin only)."""
    admin_id, admin_school_id = admin_scope
    if admin_school_id is not None:
        raise HTTPException(status_code=403, detail="Only superadmin can delete schools")
    return await asyncio.to_thread(SchoolsService.delete_school, school_id)


# ── Student Management ────────────────────────────────────────

@router.get("/{school_id}/students")
async def get_school_students(
    school_id: int,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: str = Query("", max_length=100),
    admin_scope: tuple = Depends(get_admin_with_school),
):
    """Get students enrolled in a school."""
    admin_id, admin_school_id = admin_scope
    verify_school_access(school_id, admin_school_id)
    return await asyncio.to_thread(SchoolsService.get_school_students, school_id, limit, offset, search)


@router.post("/{school_id}/import-students", response_model=StudentImportResult)
async def import_students(
    school_id: int,
    data: StudentImportRequest,
    admin_scope: tuple = Depends(get_admin_with_school),
):
    """Bulk import students into a school."""
    admin_id, admin_school_id = admin_scope
    verify_school_access(school_id, admin_school_id)
    return await asyncio.to_thread(SchoolsService.import_students, school_id, [s.model_dump() for s in data.students])


# ── Student Self-Service ──────────────────────────────────────

@router.post("/join", response_model=JoinSchoolResponse)
async def join_school(data: JoinSchoolRequest, user_id: str = Depends(get_current_user)):
    """Student joins a school using school code."""
    return await asyncio.to_thread(SchoolsService.join_school, user_id, data.school_code)


@router.get("/code/{school_code}")
async def get_school_by_code(school_code: str):
    """Get school info by join code (public - for validation)."""
    school = await asyncio.to_thread(SchoolsService.get_school_by_code, school_code)
    # Return limited info for public endpoint
    return {
        "name": school["name"],
        "city": school.get("city", ""),
        "is_active": school["is_active"],
    }


# ── Analytics ─────────────────────────────────────────────────

@router.get("/{school_id}/analytics", response_model=SchoolAnalytics)
async def get_school_analytics(school_id: int, admin_scope: tuple = Depends(get_admin_with_school)):
    """Get analytics for a school."""
    admin_id, admin_school_id = admin_scope
    verify_school_access(school_id, admin_school_id)
    return await asyncio.to_thread(SchoolsService.get_school_analytics, school_id)


# ── Billing ───────────────────────────────────────────────────

@router.post("/{school_id}/upgrade")
async def upgrade_school(
    school_id: int,
    data: SchoolUpgradeRequest,
    admin_scope: tuple = Depends(get_admin_with_school),
):
    """Upgrade school plan (superadmin only, after payment verification)."""
    admin_id, admin_school_id = admin_scope
    if admin_school_id is not None:
        raise HTTPException(status_code=403, detail="Only superadmin can upgrade school plans")
    return await asyncio.to_thread(SchoolsService.upgrade_school_plan, school_id, data.plan)
