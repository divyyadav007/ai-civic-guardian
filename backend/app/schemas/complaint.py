from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


# ---------- Draft creation ----------

class DraftCreateRequest(BaseModel):
    """Sent by mobile app after uploading photo + optional voice note."""
    photo_url: Optional[str] = None         # pre-uploaded media URL
    voice_note_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    typed_description: Optional[str] = None  # fallback if no voice


class DraftResponse(BaseModel):
    """Returned to citizen for review & approval."""
    draft_id: str
    detected_issue_type: Optional[str] = None
    classification_confidence: Optional[float] = None
    model_version: Optional[str] = None
    needs_manual_category: bool = False
    transcript: Optional[str] = None
    description: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    status: str = "draft"


# ---------- Draft edit ----------

class DraftUpdateRequest(BaseModel):
    detected_issue_type: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ---------- Submit ----------

class SubmitResponse(BaseModel):
    complaint_id: str
    status: str
    department_name: Optional[str] = None
    department_id: Optional[str] = None
    message: str = "Complaint submitted and routed successfully"


# ---------- Status update (officer/admin) ----------

class StatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None
    duplicate_of: Optional[str] = None  # complaint ID if marking duplicate


# ---------- Complaint list / detail ----------

class StatusHistoryItem(BaseModel):
    id: str
    status: str
    note: Optional[str] = None
    changed_by_name: Optional[str] = None
    changed_at: datetime

    model_config = {"from_attributes": True}


class ComplaintSummary(BaseModel):
    id: str
    detected_issue_type: Optional[str] = None
    classification_confidence: Optional[float] = None
    description: str
    address: Optional[str] = None
    status: str
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_duplicate: bool = False

    model_config = {"from_attributes": True}


class ComplaintDetail(ComplaintSummary):
    citizen_id: str
    citizen_name: Optional[str] = None
    voice_note_url: Optional[str] = None
    transcript: Optional[str] = None
    model_version: Optional[str] = None
    needs_manual_category: bool = False
    duplicate_of: Optional[str] = None
    approved_at: Optional[datetime] = None
    status_history: List[StatusHistoryItem] = []

    model_config = {"from_attributes": True}


class PublicComplaintTrack(BaseModel):
    id: str
    detected_issue_type: Optional[str] = None
    description: str
    address: Optional[str] = None
    status: str
    photo_url: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status_history: List[StatusHistoryItem] = []

    model_config = {"from_attributes": True}


# ---------- Admin stats ----------

class AdminStats(BaseModel):
    total_complaints: int
    resolved_this_week: int
    avg_resolution_hours: Optional[float] = None
    active_in_progress: int
    by_status: dict
    by_category: dict
