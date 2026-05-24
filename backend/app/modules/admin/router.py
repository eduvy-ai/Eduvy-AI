"""
Admin Router - API endpoints for admin panel.
"""
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
def admin_setup(data: AdminSetupRequest):
    """Create first superadmin."""
    return AdminService.setup(data.email, data.password, data.name)


@router.post("/login")
def admin_login(data: AdminLoginRequest):
    """Admin login."""
    return AdminService.login(data.email, data.password)


@router.get("/me")
def admin_me(admin_id: int = Depends(get_admin_user)):
    """Get admin profile."""
    return AdminService.get_me(admin_id)


# ── Boards ────────────────────────────────────────────────────

@router.get("/boards")
def list_boards(admin_id: int = Depends(get_admin_user)):
    """List all boards."""
    return AdminService.list_boards()


@router.post("/boards", status_code=201)
def create_board(data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    """Create or update board."""
    return AdminService.upsert_board(data.id, data.name, data.sort_order, data.is_active)


@router.put("/boards/{board_id}")
def update_board(board_id: str, data: BoardUpsert, admin_id: int = Depends(get_admin_user)):
    """Update board."""
    return AdminService.upsert_board(board_id, data.name, data.sort_order, data.is_active)


@router.delete("/boards/{board_id}")
def delete_board(board_id: str, admin_id: int = Depends(get_admin_user)):
    """Soft-delete board."""
    return AdminService.delete_board(board_id)


# ── Standards ─────────────────────────────────────────────────

@router.get("/standards")
def list_standards(admin_id: int = Depends(get_admin_user)):
    """List all standards."""
    return AdminService.list_standards()


@router.post("/standards", status_code=201)
def create_standard(data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    """Create or update standard."""
    return AdminService.upsert_standard(data.id, data.name, data.grade_num, data.sort_order, data.is_active)


@router.put("/standards/{std_id}")
def update_standard(std_id: str, data: StandardUpsert, admin_id: int = Depends(get_admin_user)):
    """Update standard."""
    return AdminService.upsert_standard(std_id, data.name, data.grade_num, data.sort_order, data.is_active)


@router.delete("/standards/{std_id}")
def delete_standard(std_id: str, admin_id: int = Depends(get_admin_user)):
    """Soft-delete standard."""
    return AdminService.delete_standard(std_id)


# ── Mediums ───────────────────────────────────────────────────

@router.get("/mediums")
def list_mediums(admin_id: int = Depends(get_admin_user)):
    """List all mediums."""
    return AdminService.list_mediums()


@router.post("/mediums", status_code=201)
def create_medium(data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    """Create or update medium."""
    return AdminService.upsert_medium(data.id, data.name, data.sort_order, data.is_active)


@router.put("/mediums/{med_id}")
def update_medium(med_id: str, data: MediumUpsert, admin_id: int = Depends(get_admin_user)):
    """Update medium."""
    return AdminService.upsert_medium(med_id, data.name, data.sort_order, data.is_active)


@router.delete("/mediums/{med_id}")
def delete_medium(med_id: str, admin_id: int = Depends(get_admin_user)):
    """Soft-delete medium."""
    return AdminService.delete_medium(med_id)
