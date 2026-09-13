import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, nullable=False)
    # routing_keys: list of issue_type strings routed to this dept
    # Stored as JSON array, e.g. ["pothole", "broken_streetlight"]
    routing_keys = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    officers = relationship("User", back_populates="department",
                            foreign_keys="[User.department_id]")
    complaints = relationship("Complaint", back_populates="department",
                              foreign_keys="[Complaint.department_id]")
