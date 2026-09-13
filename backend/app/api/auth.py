"""
api/auth.py — Auth endpoints: register, login, OTP verify.
Per ARCHITECTURE §5 and RULES §2.1 (thin controllers).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.session import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    OTPVerifyRequest, OTPVerifyResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new citizen/officer/admin account."""
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check uniqueness
    filters = []
    if body.email:
        filters.append(User.email == body.email)
    if body.phone:
        filters.append(User.phone == body.phone)

    existing = await db.execute(select(User).where(or_(*filters)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or phone already registered")

    hashed = get_password_hash(body.password) if body.password else None

    user = User(
        name=body.name,
        email=body.email,
        phone=body.phone,
        hashed_password=hashed,
        role=body.role,
    )
    db.add(user)
    await db.flush()   # get the generated id before commit
    await db.refresh(user)

    return RegisterResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Email/password login for department officers and admins."""
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Lookup user
    if body.email:
        result = await db.execute(select(User).where(User.email == body.email))
    else:
        result = await db.execute(select(User).where(User.phone == body.phone))

    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        subject=user.id,
        role=user.role,
        department_id=user.department_id,
    )

    return LoginResponse(
        access_token=token,
        user_id=user.id,
        role=user.role,
        name=user.name,
        department_id=user.department_id,
    )


@router.post("/otp/verify", response_model=OTPVerifyResponse)
async def verify_otp(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    OTP verification for citizen phone login.
    Dev mode: accepts settings.DEV_OTP_CODE as valid OTP (RULES §2.3 — no secrets in code).
    """
    # In production, compare against a time-limited OTP stored in Redis/DB.
    # For Phase 0/1 dev: accept the DEV_OTP_CODE from config.
    if body.otp_code != settings.DEV_OTP_CODE:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-register citizen on first OTP verify (phone-first flow)
        user = User(name=body.phone, phone=body.phone, role="citizen")
        db.add(user)
        await db.flush()
        await db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role)

    return OTPVerifyResponse(
        access_token=token,
        user_id=user.id,
        role=user.role,
        name=user.name,
    )
