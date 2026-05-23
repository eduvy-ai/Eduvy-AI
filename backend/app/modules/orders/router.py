from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependency import get_current_active_user, get_current_admin_user
from app.modules.orders.schema import OrderCreate, OrderUpdate, OrderResponse, OrdersListResponse
from app.modules.orders.service import (
    get_all_orders,
    get_order,
    create_new_order,
    update_existing_order,
    cancel_existing_order,
)

router = APIRouter()


@router.get("", response_model=OrdersListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Get all orders (admin only)."""
    return await get_all_orders(db, page, page_size, status)


@router.get("/my", response_model=OrdersListResponse)
async def list_my_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """Get current user's orders."""
    return await get_all_orders(db, page, page_size, user_id=current_user.id)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_by_id(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """Get order by ID."""
    is_admin = current_user.role == "admin"
    return await get_order(db, order_id, user_id=current_user.id, is_admin=is_admin)


@router.post("", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """Create a new order."""
    return await create_new_order(db, current_user.id, order_data)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Update order (admin only)."""
    return await update_existing_order(db, order_id, order_data)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """Cancel an order."""
    is_admin = current_user.role == "admin"
    return await cancel_existing_order(db, order_id, current_user.id, is_admin)
