# Products Module
# Note: Import router directly in main.py to avoid circular imports
from app.modules.products.model import Product
from app.modules.products.schema import ProductCreate, ProductUpdate, ProductResponse, ProductsListResponse
