from fastapi import HTTPException, status


class OrderNotFoundException(HTTPException):
    """Order not found."""
    def __init__(self, order_id: str = None):
        detail = "Order not found" + (f": {order_id}" if order_id else "")
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class OrderCannotBeCancelledException(HTTPException):
    """Order cannot be cancelled."""
    def __init__(self, order_id: str = None, reason: str = None):
        detail = f"Order cannot be cancelled"
        if order_id:
            detail += f": {order_id}"
        if reason:
            detail += f". {reason}"
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedOrderAccessException(HTTPException):
    """Unauthorized access to order."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this order"
        )
