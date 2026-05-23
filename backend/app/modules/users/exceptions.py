from fastapi import HTTPException, status


class UserNotFoundException(HTTPException):
    """User not found."""
    def __init__(self, user_id: str = None):
        detail = f"User not found" + (f": {user_id}" if user_id else "")
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class UserExistsException(HTTPException):
    """User already exists."""
    def __init__(self, email: str = None):
        detail = "User with this email already exists" + (f": {email}" if email else "")
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class CannotDeleteSelfException(HTTPException):
    """Cannot delete own account."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
