"""
api/complaints.py — Complaint lifecycle endpoints.
Per ARCHITECTURE §5 + RULES §2.1 (thin controllers).
Async parallel classification + geocoding + STT per ARCHITECTURE §5 note.
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.config import settings
from app.models.user import User
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.status_history import StatusHistory
from app.schemas.complaint import (
    DraftCreateRequest, DraftResponse, DraftUpdateRequest,
    SubmitResponse, StatusUpdateRequest,
    ComplaintSummary, ComplaintDetail, StatusHistoryItem,
    PublicComplaintTrack,
)
from app.api.deps import get_current_user, get_current_user_or_guest, require_officer_or_admin
from app.services.classification_service import get_classification_provider
from app.services.geocoding_service import get_geocoding_provider
from app.services.stt_service import get_stt_provider
from app.services.draft_generator import generate_draft, DraftInput
from app.services.routing_engine import route_complaint, DepartmentRecord

router = APIRouter(prefix="/complaints", tags=["Complaints"])


# ── Draft creation (POST /complaints/draft) ──────────────────────────────────

@router.post("/draft", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
async def create_draft(
    body: DraftCreateRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload photo + optional voice/location → run AI pipeline → return draft.
    Classification, geocoding, and STT run concurrently (ARCHITECTURE §5).
    """
    classifier = get_classification_provider(settings.CLASSIFICATION_PROVIDER)
    geocoder = get_geocoding_provider(settings.GEOCODING_PROVIDER)
    stt = get_stt_provider(settings.STT_PROVIDER)

    # Run all I/O-bound calls concurrently (RULES §2.6)
    classification_task = classifier.classify(body.photo_url or "") if body.photo_url else None
    geocoding_task = (
        geocoder.reverse_geocode(body.latitude, body.longitude)
        if body.latitude is not None and body.longitude is not None
        else None
    )
    stt_task = stt.transcribe(body.voice_note_url) if body.voice_note_url else None

    results = await asyncio.gather(
        classification_task or asyncio.sleep(0),
        geocoding_task or asyncio.sleep(0),
        stt_task or asyncio.sleep(0),
        return_exceptions=True,
    )

    cls_result = results[0] if classification_task else None
    address = results[1] if geocoding_task and not isinstance(results[1], Exception) else None
    transcript = results[2] if stt_task and not isinstance(results[2], Exception) else None

    # Handle classification failure gracefully (RULES §2.7)
    if isinstance(cls_result, Exception):
        cls_result = None

    draft_input = DraftInput(
        issue_type=cls_result.issue_type if cls_result else None,
        confidence=cls_result.confidence if cls_result else None,
        confidence_threshold=settings.CLASSIFICATION_CONFIDENCE_THRESHOLD,
        transcript=transcript,
        typed_description=body.typed_description,
        address=address,
        latitude=body.latitude,
        longitude=body.longitude,
        photo_url=body.photo_url,
        voice_note_url=body.voice_note_url,
        model_version=cls_result.model_version if cls_result else None,
    )
    draft_out = generate_draft(draft_input)

    # Persist draft complaint
    complaint = Complaint(
        citizen_id=current_user.id,
        photo_url=draft_out.photo_url,
        voice_note_url=draft_out.voice_note_url,
        detected_issue_type=draft_out.detected_issue_type,
        classification_confidence=draft_out.classification_confidence,
        model_version=draft_out.model_version,
        needs_manual_category=draft_out.needs_manual_category,
        transcript=draft_out.transcript,
        description=draft_out.description,
        latitude=draft_out.latitude,
        longitude=draft_out.longitude,
        address=draft_out.address,
        status="draft",
    )
    db.add(complaint)
    await db.flush()
    await db.refresh(complaint)

    return DraftResponse(
        draft_id=complaint.id,
        detected_issue_type=complaint.detected_issue_type,
        classification_confidence=complaint.classification_confidence,
        model_version=complaint.model_version,
        needs_manual_category=complaint.needs_manual_category,
        transcript=complaint.transcript,
        description=complaint.description,
        address=complaint.address,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        photo_url=complaint.photo_url,
        voice_note_url=complaint.voice_note_url,
        status=complaint.status,
    )


# ── Draft edit (PATCH /complaints/draft/{draft_id}) ──────────────────────────

@router.patch("/draft/{draft_id}", response_model=DraftResponse)
async def update_draft(
    draft_id: str,
    body: DraftUpdateRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Citizen edits fields on their draft before approval."""
    result = await db.execute(select(Complaint).where(Complaint.id == draft_id))
    complaint = result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(status_code=404, detail="Draft not found")
    if complaint.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft complaints can be edited")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(complaint, field, value)

    # If citizen manually picks a category, clear the manual flag
    if body.detected_issue_type:
        complaint.needs_manual_category = False

    await db.flush()
    await db.refresh(complaint)

    return DraftResponse(
        draft_id=complaint.id,
        detected_issue_type=complaint.detected_issue_type,
        classification_confidence=complaint.classification_confidence,
        model_version=complaint.model_version,
        needs_manual_category=complaint.needs_manual_category,
        transcript=complaint.transcript,
        description=complaint.description,
        address=complaint.address,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        photo_url=complaint.photo_url,
        voice_note_url=complaint.voice_note_url,
        status=complaint.status,
    )


# ── Submit (POST /complaints/{draft_id}/submit) ───────────────────────────────

@router.post("/{draft_id}/submit", response_model=SubmitResponse)
async def submit_complaint(
    draft_id: str,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Citizen approves draft → persists Complaint, runs routing, sets status=submitted.
    Per RULES §3.3: NO code path submits without explicit citizen approval action.
    """
    result = await db.execute(select(Complaint).where(Complaint.id == draft_id))
    complaint = result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(status_code=404, detail="Draft not found")
    if complaint.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your draft")
    if complaint.status != "draft":
        raise HTTPException(status_code=409, detail="Complaint already submitted")

    # Route to department
    dept_result = await db.execute(select(Department))
    departments = dept_result.scalars().all()
    dept_records = [
        DepartmentRecord(id=d.id, name=d.name, routing_keys=d.routing_keys or [])
        for d in departments
    ]
    matched = route_complaint(complaint.detected_issue_type, dept_records)

    complaint.department_id = matched.id if matched else None
    complaint.status = "submitted"
    complaint.approved_at = datetime.now(timezone.utc)

    # Append status history (ARCHITECTURE §4, PRD NFR Auditability)
    history_entry = StatusHistory(
        complaint_id=complaint.id,
        status="submitted",
        note="Citizen approved and submitted complaint",
        changed_by=current_user.id,
    )
    db.add(history_entry)
    await db.flush()

    return SubmitResponse(
        complaint_id=complaint.id,
        status="submitted",
        department_name=matched.name if matched else None,
        department_id=complaint.department_id,
    )


# ── Citizen: my complaints ────────────────────────────────────────────────────

@router.get("/mine", response_model=List[ComplaintSummary])
async def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """Return the current citizen's complaints."""
    q = select(Complaint).where(Complaint.citizen_id == current_user.id)
    if status_filter:
        q = q.where(Complaint.status == status_filter)
    q = q.order_by(Complaint.created_at.desc())

    result = await db.execute(q.options(selectinload(Complaint.department)))
    complaints = result.scalars().all()
    return [_to_summary(c) for c in complaints]


# ── Public tracking (GET /complaints/public/track/{complaint_id}) ──────────────

@router.get("/public/track/{complaint_id}", response_model=PublicComplaintTrack)
async def public_track_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Public tracking endpoint allowing citizens to check resolution status by ID."""
    result = await db.execute(
        select(Complaint)
        .where(Complaint.id == complaint_id)
        .options(
            selectinload(Complaint.department),
            selectinload(Complaint.status_history).selectinload(StatusHistory.changed_by_user),
        )
    )
    complaint = result.scalar_one_or_none()
    if not complaint or complaint.status == "draft":
        raise HTTPException(status_code=404, detail="Complaint not found")

    dept_name = complaint.department.name if complaint.department else None

    history_items = [
        StatusHistoryItem(
            id=h.id,
            status=h.status,
            note=h.note,
            changed_by_name=h.changed_by_user.name if h.changed_by_user else None,
            changed_at=h.changed_at,
        )
        for h in (complaint.status_history or [])
    ]

    return PublicComplaintTrack(
        id=complaint.id,
        detected_issue_type=complaint.detected_issue_type,
        description=complaint.description,
        address=complaint.address,
        status=complaint.status,
        photo_url=complaint.photo_url,
        department_name=dept_name,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        status_history=history_items,
    )


# ── Complaint detail ──────────────────────────────────────────────────────────

@router.get("/{complaint_id}", response_model=ComplaintDetail)
async def get_complaint(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full complaint detail. Citizens see only their own; officers/admin see any."""
    result = await db.execute(
        select(Complaint)
        .where(Complaint.id == complaint_id)
        .options(
            selectinload(Complaint.department),
            selectinload(Complaint.citizen),
            selectinload(Complaint.status_history).selectinload(StatusHistory.changed_by_user),
        )
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Citizens can only see their own
    if current_user.role == "citizen" and complaint.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return _to_detail(complaint)


# ── Status update (officer/admin) ─────────────────────────────────────────────

@router.patch("/{complaint_id}/status", response_model=ComplaintDetail)
async def update_status(
    complaint_id: str,
    body: StatusUpdateRequest,
    current_user: User = Depends(require_officer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Officer/admin updates complaint status + optional note."""
    valid_statuses = {"acknowledged", "in_progress", "resolved", "rejected", "duplicate"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of {valid_statuses}")

    result = await db.execute(
        select(Complaint)
        .where(Complaint.id == complaint_id)
        .options(
            selectinload(Complaint.department),
            selectinload(Complaint.citizen),
            selectinload(Complaint.status_history).selectinload(StatusHistory.changed_by_user),
        )
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Officers can only update complaints in their department
    if current_user.role == "officer" and complaint.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Complaint not in your department")

    complaint.status = body.status
    if body.duplicate_of:
        complaint.duplicate_of = body.duplicate_of

    history_entry = StatusHistory(
        complaint_id=complaint.id,
        status=body.status,
        note=body.note,
        changed_by=current_user.id,
    )
    db.add(history_entry)
    await db.flush()
    await db.refresh(complaint)

    return _to_detail(complaint)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_summary(c: Complaint) -> ComplaintSummary:
    return ComplaintSummary(
        id=c.id,
        detected_issue_type=c.detected_issue_type,
        classification_confidence=c.classification_confidence,
        description=c.description,
        address=c.address,
        status=c.status,
        photo_url=c.photo_url,
        latitude=c.latitude,
        longitude=c.longitude,
        department_name=c.department.name if c.department else None,
        created_at=c.created_at,
        updated_at=c.updated_at,
        is_duplicate=c.duplicate_of is not None,
    )


def _to_detail(c: Complaint) -> ComplaintDetail:
    history = [
        StatusHistoryItem(
            id=h.id,
            status=h.status,
            note=h.note,
            changed_by_name=h.changed_by_user.name if h.changed_by_user else None,
            changed_at=h.changed_at,
        )
        for h in (c.status_history or [])
    ]
    return ComplaintDetail(
        id=c.id,
        citizen_id=c.citizen_id,
        citizen_name=c.citizen.name if c.citizen else None,
        detected_issue_type=c.detected_issue_type,
        classification_confidence=c.classification_confidence,
        description=c.description,
        address=c.address,
        status=c.status,
        photo_url=c.photo_url,
        voice_note_url=c.voice_note_url,
        transcript=c.transcript,
        latitude=c.latitude,
        longitude=c.longitude,
        model_version=c.model_version,
        needs_manual_category=c.needs_manual_category,
        department_name=c.department.name if c.department else None,
        duplicate_of=c.duplicate_of,
        approved_at=c.approved_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
        is_duplicate=c.duplicate_of is not None,
        status_history=history,
    )
