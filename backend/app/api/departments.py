"""
api/departments.py — Department queue for officers + department management for admin.
Per ARCHITECTURE §5 + RULES §2.1 (thin controllers).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.status_history import StatusHistory
from app.schemas.complaint import ComplaintSummary, ComplaintDetail
from app.schemas.department import DepartmentResponse, DepartmentCreate, DepartmentUpdate
from app.api.deps import get_current_user, require_officer_or_admin, require_admin
from app.api.complaints import _to_summary, _to_detail
from app.models.user import User

router = APIRouter(prefix="/departments", tags=["Departments"])


# ── Officer queue: GET /departments/{dept_id}/complaints ─────────────────────

@router.get("/{dept_id}/complaints", response_model=List[ComplaintSummary])
async def get_department_complaints(
    dept_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_officer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Officer queue: complaints routed to a specific department.
    Officers can only view their own department — RULES §5.4, DESIGN §3.7.
    """
    if current_user.role == "officer" and current_user.department_id != dept_id:
        raise HTTPException(status_code=403, detail="Access denied to this department's queue")

    q = (
        select(Complaint)
        .where(Complaint.department_id == dept_id)
        .where(Complaint.status != "draft")   # drafts not yet submitted
        .options(selectinload(Complaint.department))
        .order_by(Complaint.created_at.desc())
    )
    if status_filter:
        q = q.where(Complaint.status == status_filter)

    result = await db.execute(q)
    complaints = result.scalars().all()
    return [_to_summary(c) for c in complaints]


# ── List all departments (admin) ─────────────────────────────────────────────

@router.get("/", response_model=List[DepartmentResponse])
async def list_departments(
    current_user: User = Depends(require_officer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all departments — used by admin routing-rules UI."""
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()


# ── Create department (admin) ─────────────────────────────────────────────────

@router.post("/", response_model=DepartmentResponse, status_code=201)
async def create_department(
    body: DepartmentCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    dept = Department(name=body.name, routing_keys=body.routing_keys)
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


# ── Update department routing keys (admin) ───────────────────────────────────

@router.patch("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: str,
    body: DepartmentUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin edits routing_keys — per ARCHITECTURE §6 (editable from DB, not hardcoded)."""
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if body.name is not None:
        dept.name = body.name
    if body.routing_keys is not None:
        dept.routing_keys = body.routing_keys

    await db.flush()
    await db.refresh(dept)
    return dept
