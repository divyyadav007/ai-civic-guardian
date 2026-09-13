# Import all models so Alembic autogenerate can discover them
from app.models.user import User           # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.complaint import Complaint    # noqa: F401
from app.models.status_history import StatusHistory  # noqa: F401

__all__ = ["User", "Department", "Complaint", "StatusHistory"]
