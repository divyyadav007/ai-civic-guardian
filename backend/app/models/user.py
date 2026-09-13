import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role = Column(SAEnum("citizen", "officer", "admin", name="user_role"), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)  # None for OTP-only citizens
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="officers", foreign_keys=[department_id])
    complaints = relationship("Complaint", back_populates="citizen",
                              foreign_keys="[Complaint.citizen_id]")
    status_changes = relationship("StatusHistory", back_populates="changed_by_user",
                                  foreign_keys="[StatusHistory.changed_by]")
