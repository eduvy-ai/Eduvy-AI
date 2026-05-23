from fastapi import HTTPException, status


class AuthException(HTTPException):
    """Base authentication exception."""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class InvalidCredentialsException(AuthException):
    """Invalid email or password."""
    def __init__(self):
        super().__init__(detail="Invalid email or password")


class UserExistsException(HTTPException):
    """User with this email already exists."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )


class InactiveUserException(AuthException):
    """User account is inactive."""
    def __init__(self):
        super().__init__(detail="User account is inactive")


class InvalidTokenException(AuthException):
    """Invalid or expired token."""
    def __init__(self):
        super().__init__(detail="Invalid or expired token")
