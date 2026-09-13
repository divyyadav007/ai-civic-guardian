# Re-export all schemas from a single namespace
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    OTPVerifyRequest, OTPVerifyResponse,
    TokenPayload,
)
from app.schemas.complaint import (
    DraftCreateRequest, DraftResponse, DraftUpdateRequest,
    SubmitResponse, StatusUpdateRequest,
    ComplaintSummary, ComplaintDetail,
    StatusHistoryItem, AdminStats,
)
from app.schemas.department import (
    DepartmentBase, DepartmentCreate, DepartmentResponse, DepartmentUpdate,
)

__all__ = [
    "RegisterRequest", "RegisterResponse",
    "LoginRequest", "LoginResponse",
    "OTPVerifyRequest", "OTPVerifyResponse", "TokenPayload",
    "DraftCreateRequest", "DraftResponse", "DraftUpdateRequest",
    "SubmitResponse", "StatusUpdateRequest",
    "ComplaintSummary", "ComplaintDetail", "StatusHistoryItem", "AdminStats",
    "DepartmentBase", "DepartmentCreate", "DepartmentResponse", "DepartmentUpdate",
]
