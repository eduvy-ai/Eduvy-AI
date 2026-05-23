from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.modules.orders.model import Order
from app.modules.orders.schema import OrderCreate, OrderUpdate


async def get_order_by_id(db: AsyncSession, order_id: str) -> Order | None:
    """Get order by ID."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def get_orders(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = None,
    user_id: Optional[str] = None
) -> tuple[List[Order], int]:
    """Get list of orders with pagination."""
    query = select(Order)
    count_query = select(func.count()).select_from(Order)
    
    if status:
        query = query.where(Order.status == status)
        count_query = count_query.where(Order.status == status)
    
    if user_id:
        query = query.where(Order.user_id == user_id)
        count_query = count_query.where(Order.user_id == user_id)
    
    # Get total count
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Get orders
    result = await db.execute(
        query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    )
    orders = result.scalars().all()
    
    return list(orders), total


async def create_order(
    db: AsyncSession,
    user_id: str,
    order_data: OrderCreate,
    subtotal: float,
    tax: float,
    total: float,
    items_with_prices: List[dict]
) -> Order:
    """Create a new order."""
    order = Order(
        user_id=user_id,
        items=items_with_prices,
        subtotal=subtotal,
        tax=tax,
        total=total,
        shipping_address=order_data.shipping_address,
        payment_method=order_data.payment_method,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def update_order(db: AsyncSession, order: Order, order_data: OrderUpdate) -> Order:
    """Update order data."""
    update_data = order_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    await db.commit()
    await db.refresh(order)
    return order


async def cancel_order(db: AsyncSession, order: Order) -> Order:
    """Cancel an order."""
    order.status = "cancelled"
    await db.commit()
    await db.refresh(order)
    return order
