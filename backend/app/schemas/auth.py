from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


# ---------- Register ----------

class RegisterRequest(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None  # None for OTP-only flow
    role: str = "citizen"  # citizen | officer | admin

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"citizen", "officer", "admin"}
        if v not in allowed:
            raise ValueError(f"role must be one of {allowed}")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^\+?\d{7,15}$", v):
            raise ValueError("Invalid phone number format")
        return v


class RegisterResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    message: str = "Registration successful"


# ---------- Login ----------

class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str
    department_id: Optional[str] = None


# ---------- OTP ----------

class OTPVerifyRequest(BaseModel):
    phone: str
    otp_code: str


class OTPVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str


# ---------- Token payload (internal) ----------

class TokenPayload(BaseModel):
    sub: str       # user ID
    role: str
    department_id: Optional[str] = None
    exp: Optional[int] = None
