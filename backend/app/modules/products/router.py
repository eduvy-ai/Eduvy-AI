from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.core.dependency import get_current_active_user, get_current_admin_user
from app.modules.products.schema import ProductCreate, ProductUpdate, ProductResponse, ProductsListResponse
from app.modules.products.service import (
    get_all_products,
    get_product,
    create_new_product,
    update_existing_product,
    delete_existing_product,
    search_for_products,
)

router = APIRouter()


@router.get("", response_model=ProductsListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all products."""
    return await get_all_products(db, page, page_size, category)


@router.get("/search", response_model=List[ProductResponse])
async def search_products(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Search products."""
    return await search_for_products(db, q)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product_by_id(
    product_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get product by ID."""
    return await get_product(db, product_id)


@router.post("", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Create a new product (admin only)."""
    return await create_new_product(db, product_data)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Update product (admin only)."""
    return await update_existing_product(db, product_id, product_data)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_admin_user),
):
    """Delete product (admin only)."""
    await delete_existing_product(db, product_id)
    return {"message": "Product deleted successfully"}
