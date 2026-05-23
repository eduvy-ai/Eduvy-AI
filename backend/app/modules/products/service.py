from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.modules.products.query import (
    get_products as query_get_products,
    get_product_by_id as query_get_product_by_id,
    create_product as query_create_product,
    update_product as query_update_product,
    delete_product as query_delete_product,
    search_products as query_search_products,
)
from app.modules.products.schema import ProductCreate, ProductUpdate, ProductResponse, ProductsListResponse
from app.modules.products.exceptions import ProductNotFoundException


async def get_all_products(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 10,
    category: str = None
) -> ProductsListResponse:
    """Get all products with pagination."""
    skip = (page - 1) * page_size
    products, total = await query_get_products(db, skip=skip, limit=page_size, category=category)
    
    return ProductsListResponse(
        data=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_product(db: AsyncSession, product_id: str) -> ProductResponse:
    """Get product by ID."""
    product = await query_get_product_by_id(db, product_id)
    if not product or product.status == "deleted":
        raise ProductNotFoundException(product_id)
    return ProductResponse.model_validate(product)


async def create_new_product(db: AsyncSession, product_data: ProductCreate) -> ProductResponse:
    """Create a new product."""
    product = await query_create_product(db, product_data)
    return ProductResponse.model_validate(product)


async def update_existing_product(db: AsyncSession, product_id: str, product_data: ProductUpdate) -> ProductResponse:
    """Update an existing product."""
    product = await query_get_product_by_id(db, product_id)
    if not product or product.status == "deleted":
        raise ProductNotFoundException(product_id)
    
    updated_product = await query_update_product(db, product, product_data)
    return ProductResponse.model_validate(updated_product)


async def delete_existing_product(db: AsyncSession, product_id: str) -> None:
    """Delete an existing product."""
    product = await query_get_product_by_id(db, product_id)
    if not product or product.status == "deleted":
        raise ProductNotFoundException(product_id)
    
    await query_delete_product(db, product)


async def search_for_products(db: AsyncSession, query: str) -> List[ProductResponse]:
    """Search products."""
    products = await query_search_products(db, query)
    return [ProductResponse.model_validate(p) for p in products]
