import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    citizen_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Media
    photo_url = Column(String(1024), nullable=True)
    voice_note_url = Column(String(1024), nullable=True)

    # AI Classification
    detected_issue_type = Column(
        SAEnum("pothole", "garbage", "water_leakage", "broken_streetlight", "other",
               name="issue_type"),
        nullable=True
    )
    classification_confidence = Column(Float, nullable=True)
    model_version = Column(String(50), nullable=True)  # RULES §3.1

    # Voice / Text
    transcript = Column(Text, nullable=True)
    description = Column(Text, nullable=False, default="")

    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(Text, nullable=True)

    # Routing
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)

    # Status
    status = Column(
        SAEnum("draft", "submitted", "acknowledged", "in_progress",
               "resolved", "rejected", "duplicate",
               name="complaint_status"),
        nullable=False,
        default="draft",
        index=True
    )
    duplicate_of = Column(String(36), ForeignKey("complaints.id"), nullable=True)

    # Flags
    needs_manual_category = Column(Boolean, default=False)  # low-confidence fallback (RULES §2.7)

    # Timestamps (UTC — RULES §2.9)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    approved_at = Column(DateTime(timezone=True), nullable=True)  # when citizen approved draft

    # Relationships
    citizen = relationship("User", back_populates="complaints",
                           foreign_keys=[citizen_id])
    department = relationship("Department", back_populates="complaints",
                              foreign_keys=[department_id])
    status_history = relationship("StatusHistory", back_populates="complaint",
                                  cascade="all, delete-orphan",
                                  order_by="StatusHistory.changed_at")
    duplicate_parent = relationship("Complaint", remote_side="Complaint.id",
                                    foreign_keys=[duplicate_of])
