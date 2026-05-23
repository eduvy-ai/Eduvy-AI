# Application Constants

# User Roles
class Roles:
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"


# Order Status
class OrderStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Payment Status
class PaymentStatus:
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


# Product Status
class ProductStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    DELETED = "deleted"


# Pagination
class Pagination:
    DEFAULT_PAGE = 1
    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 100


# AI Providers
class AIProviders:
    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"
    GROQ = "groq"


# Plan Limits
class PlanLimits:
    FREE = {
        "ai_calls_per_day": 10,
        "max_documents": 5,
    }
    BASIC = {
        "ai_calls_per_day": 50,
        "max_documents": 20,
    }
    PRO = {
        "ai_calls_per_day": 200,
        "max_documents": 100,
    }
    PREMIUM = {
        "ai_calls_per_day": float("inf"),
        "max_documents": float("inf"),
    }
