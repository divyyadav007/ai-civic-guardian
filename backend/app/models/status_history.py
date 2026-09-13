import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class StatusHistory(Base):
    """Audit log of every complaint status change — ARCHITECTURE §4 + RULES §2.9 + PRD NFR Auditability."""
    __tablename__ = "status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id"), nullable=False, index=True)
    status = Column(
        SAEnum("draft", "submitted", "acknowledged", "in_progress",
               "resolved", "rejected", "duplicate",
               name="status_history_status"),
        nullable=False
    )
    note = Column(Text, nullable=True)  # officer resolution note
    changed_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        nullable=False, index=True)

    # Relationships
    complaint = relationship("Complaint", back_populates="status_history")
    changed_by_user = relationship("User", back_populates="status_changes",
                                   foreign_keys=[changed_by])
