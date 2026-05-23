from fastapi import HTTPException, status


class ProductNotFoundException(HTTPException):
    """Product not found."""
    def __init__(self, product_id: str = None):
        detail = "Product not found" + (f": {product_id}" if product_id else "")
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class InsufficientStockException(HTTPException):
    """Insufficient stock."""
    def __init__(self, product_name: str = None, available: int = 0):
        detail = f"Insufficient stock for {product_name}. Available: {available}"
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
