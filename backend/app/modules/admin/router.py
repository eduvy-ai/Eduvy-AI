"""
Admin Router - API endpoints for admin panel.
"""
import asyncio
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.modules.admin.schemas import (
    AdminLoginRequest, AdminSetupRequest,
    BoardUpsert, StandardUpsert, MediumUpsert
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
    """List all boards."""
    return await asyncio.to_thread(AdminService.list_boards)


@router.post("/boards", status_code=201)
async def create_board(data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    """Create or update board."""
    return await asyncio.to_thread(
        AdminService.upsert_board, data.id, data.name, data.sort_order, data.is_active
    )


@router.put("/boards/{board_id}")
async def update_board(board_id: str, data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    """Update board."""
    return await asyncio.to_thread(
        AdminService.upsert_board, board_id, data.name, data.sort_order, data.is_active
    )


@router.delete("/boards/{board_id}")
async def delete_board(board_id: str, admin_id: int = Depends(get_admin_user)):
    """Soft-delete board."""
    return await asyncio.to_thread(AdminService.delete_board, board_id)


# ── Standards ─────────────────────────────────────────────────

@router.get("/standards")
async def list_standards(admin_id: int = Depends(get_admin_user)):
    """List all standards."""
    return await asyncio.to_thread(AdminService.list_standards)


@router.post("/standards", status_code=201)
async def create_standard(data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    """Create or update standard."""
    return await asyncio.to_thread(
        AdminService.upsert_standard, data.id, data.name, data.grade_num, data.sort_order, data.is_active
    )


@router.put("/standards/{std_id}")
async def update_standard(std_id: str, data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    """Update standard."""
    return await asyncio.to_thread(
        AdminService.upsert_standard, std_id, data.name, data.grade_num, data.sort_order, data.is_active
    )


@router.delete("/standards/{std_id}")
async def delete_standard(std_id: str, admin_id: int = Depends(get_admin_user)):
    """Soft-delete standard."""
    return await asyncio.to_thread(AdminService.delete_standard, std_id)


# ── Mediums ───────────────────────────────────────────────────

@router.get("/mediums")
async def list_mediums(admin_id: int = Depends(get_admin_user)):
    """List all mediums."""
    return await asyncio.to_thread(AdminService.list_mediums)


@router.post("/mediums", status_code=201)
async def create_medium(data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    """Create or update medium."""
    return await asyncio.to_thread(
        AdminService.upsert_medium, data.id, data.name, data.sort_order, data.is_active
    )


@router.put("/mediums/{med_id}")
async def update_medium(med_id: str, data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    """Update medium."""
    return await asyncio.to_thread(
        AdminService.upsert_medium, med_id, data.name, data.sort_order, data.is_active
    )


@router.delete("/mediums/{med_id}")
async def delete_medium(med_id: str, admin_id: int = Depends(get_admin_user)):
    """Soft-delete medium."""
    return await asyncio.to_thread(AdminService.delete_medium, med_id)
