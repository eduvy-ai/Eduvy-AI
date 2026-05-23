from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.modules.orders.query import (
    get_orders as query_get_orders,
    get_order_by_id as query_get_order_by_id,
    create_order as query_create_order,
    update_order as query_update_order,
    cancel_order as query_cancel_order,
)
from app.modules.orders.schema import OrderCreate, OrderUpdate, OrderResponse, OrdersListResponse, OrderItem
from app.modules.orders.exceptions import OrderNotFoundException, OrderCannotBeCancelledException, UnauthorizedOrderAccessException
from app.modules.products.query import get_product_by_id


async def get_all_orders(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 10,
    status: str = None,
    user_id: str = None
) -> OrdersListResponse:
    """Get all orders with pagination."""
    skip = (page - 1) * page_size
    orders, total = await query_get_orders(db, skip=skip, limit=page_size, status=status, user_id=user_id)
    
    return OrdersListResponse(
        data=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_order(db: AsyncSession, order_id: str, user_id: str = None, is_admin: bool = False) -> OrderResponse:
    """Get order by ID."""
    order = await query_get_order_by_id(db, order_id)
    if not order:
        raise OrderNotFoundException(order_id)
    
    # Check authorization
    if not is_admin and user_id and order.user_id != user_id:
        raise UnauthorizedOrderAccessException()
    
    return OrderResponse.model_validate(order)


async def create_new_order(db: AsyncSession, user_id: str, order_data: OrderCreate) -> OrderResponse:
    """Create a new order."""
    items_with_prices = []
    subtotal = 0
    
    # Calculate prices for each item
    for item in order_data.items:
        product = await get_product_by_id(db, item.product_id)
        if product:
            item_total = product.price * item.quantity
            items_with_prices.append({
                "product_id": item.product_id,
                "product_name": product.name,
                "quantity": item.quantity,
                "price": product.price,
                "total": item_total,
            })
            subtotal += item_total
    
    tax = subtotal * 0.18  # 18% tax
    total = subtotal + tax
    
    order = await query_create_order(db, user_id, order_data, subtotal, tax, total, items_with_prices)
    return OrderResponse.model_validate(order)


async def update_existing_order(db: AsyncSession, order_id: str, order_data: OrderUpdate) -> OrderResponse:
    """Update an existing order."""
    order = await query_get_order_by_id(db, order_id)
    if not order:
        raise OrderNotFoundException(order_id)
    
    updated_order = await query_update_order(db, order, order_data)
    return OrderResponse.model_validate(updated_order)


async def cancel_existing_order(db: AsyncSession, order_id: str, user_id: str, is_admin: bool = False) -> OrderResponse:
    """Cancel an existing order."""
    order = await query_get_order_by_id(db, order_id)
    if not order:
        raise OrderNotFoundException(order_id)
    
    # Check authorization
    if not is_admin and order.user_id != user_id:
        raise UnauthorizedOrderAccessException()
    
    # Check if order can be cancelled
    if order.status in ["shipped", "delivered", "cancelled"]:
        raise OrderCannotBeCancelledException(order_id, f"Order status is {order.status}")
    
    cancelled_order = await query_cancel_order(db, order)
    return OrderResponse.model_validate(cancelled_order)
