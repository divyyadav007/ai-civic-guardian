"""
api/admin.py — Cross-department admin endpoints: stats + all-complaints search.
Per ARCHITECTURE §5 + DESIGN §3.9 (Admin Overview).
"""
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.status_history import StatusHistory
from app.schemas.complaint import AdminStats, ComplaintSummary
from app.api.deps import require_admin
from app.api.complaints import _to_summary
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Aggregate stats ───────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard summary cards + chart data — DESIGN §3.9."""
    # Total complaints (non-draft)
    total_res = await db.execute(
        select(func.count(Complaint.id)).where(Complaint.status != "draft")
    )
    total = total_res.scalar() or 0

    # Resolved this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    resolved_res = await db.execute(
        select(func.count(Complaint.id))
        .where(Complaint.status == "resolved")
        .where(Complaint.updated_at >= week_ago)
    )
    resolved_week = resolved_res.scalar() or 0

    # Active in-progress
    active_res = await db.execute(
        select(func.count(Complaint.id)).where(Complaint.status == "in_progress")
    )
    active = active_res.scalar() or 0

    # By status
    status_rows = await db.execute(
        select(Complaint.status, func.count(Complaint.id))
        .where(Complaint.status != "draft")
        .group_by(Complaint.status)
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # By category
    cat_rows = await db.execute(
        select(Complaint.detected_issue_type, func.count(Complaint.id))
        .where(Complaint.detected_issue_type.isnot(None))
        .group_by(Complaint.detected_issue_type)
    )
    by_category = {row[0]: row[1] for row in cat_rows}

    return AdminStats(
        total_complaints=total,
        resolved_this_week=resolved_week,
        avg_resolution_hours=None,   # Phase 6 — requires time diff between status changes
        active_in_progress=active,
        by_status=by_status,
        by_category=by_category,
    )


# ── All complaints (cross-department search) ──────────────────────────────────

@router.get("/complaints", response_model=List[ComplaintSummary])
async def get_all_complaints(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    department_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Cross-department complaint list for admin — DESIGN §3.9 / ARCHITECTURE §5."""
    q = (
        select(Complaint)
        .where(Complaint.status != "draft")
        .options(selectinload(Complaint.department))
        .order_by(Complaint.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if status_filter:
        q = q.where(Complaint.status == status_filter)
    if category_filter:
        q = q.where(Complaint.detected_issue_type == category_filter)
    if department_id:
        q = q.where(Complaint.department_id == department_id)

    result = await db.execute(q)
    complaints = result.scalars().all()
    return [_to_summary(c) for c in complaints]
