from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.modules.products.model import Product
from app.modules.products.schema import ProductCreate, ProductUpdate


async def get_product_by_id(db: AsyncSession, product_id: str) -> Product | None:
    """Get product by ID."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    return result.scalar_one_or_none()


async def get_products(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 10,
    category: Optional[str] = None
) -> tuple[List[Product], int]:
    """Get list of products with pagination."""
    query = select(Product).where(Product.status != "deleted")
    
    if category:
        query = query.where(Product.category == category)
    
    # Get total count
    count_query = select(func.count()).select_from(Product).where(Product.status != "deleted")
    if category:
        count_query = count_query.where(Product.category == category)
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Get products
    result = await db.execute(
        query.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    )
    products = result.scalars().all()
    
    return list(products), total


async def create_product(db: AsyncSession, product_data: ProductCreate) -> Product:
    """Create a new product."""
    product = Product(**product_data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def update_product(db: AsyncSession, product: Product, product_data: ProductUpdate) -> Product:
    """Update product data."""
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product: Product) -> None:
    """Soft delete a product."""
    product.status = "deleted"
    await db.commit()


async def search_products(db: AsyncSession, query: str) -> List[Product]:
    """Search products by name or description."""
    result = await db.execute(
        select(Product)
        .where(Product.status != "deleted")
        .where(
            Product.name.ilike(f"%{query}%") | 
            Product.description.ilike(f"%{query}%")
        )
        .limit(20)
    )
    return list(result.scalars().all())
