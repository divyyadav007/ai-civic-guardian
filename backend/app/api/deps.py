"""
api/deps.py — Shared FastAPI dependencies.
Per RULES §2.1: thin controllers; business logic lives in services.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT and return the current User. Raises 401 if invalid."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not authenticated")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User not found")
    return user


async def get_current_user_or_guest(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT if provided, or return/create default public citizen user."""
    if credentials:
        payload = decode_access_token(credentials.credentials)
        if payload:
            user_id = payload.get("sub")
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                return user

    # Fallback to existing citizen in DB
    result = await db.execute(select(User).where(User.role == "citizen"))
    citizen = result.scalars().first()
    if citizen:
        return citizen

    # Create one if database is fresh
    guest = User(name="Public Citizen", email="citizen@civic.gov.in", role="citizen")
    db.add(guest)
    await db.flush()
    await db.refresh(guest)
    return guest


def require_roles(*roles: str):
    """Dependency factory — enforce role-based access per RULES §5.4."""
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(roles)}"
            )
        return current_user
    return _check


require_officer_or_admin = require_roles("officer", "admin")
require_admin = require_roles("admin")
require_citizen = require_roles("citizen", "officer", "admin")  # any authenticated user
