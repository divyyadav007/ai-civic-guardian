"""
routing_engine.py — Rule-based issue_type → department routing.

Per ARCHITECTURE §6: rule table is stored in DB and editable by admin,
not hardcoded. This service reads routing_keys from Department rows.
Per RULES §2.10: pure business logic, fully unit-testable without DB (pass dept list in).
"""
from typing import Optional, List
from dataclasses import dataclass


@dataclass
class DepartmentRecord:
    """Lightweight DTO used by routing engine — decoupled from SQLAlchemy model."""
    id: str
    name: str
    routing_keys: List[str]


def route_complaint(
    issue_type: Optional[str],
    departments: List[DepartmentRecord],
) -> Optional[DepartmentRecord]:
    """
    Given an issue_type string and a list of DepartmentRecords,
    return the matching department or None if no rule matches.

    Matching is case-insensitive and strips whitespace.
    """
    if not issue_type:
        return None

    normalized = issue_type.strip().lower()

    for dept in departments:
        for key in dept.routing_keys:
            if key.strip().lower() == normalized:
                return dept

    return None


def get_default_routing_rules() -> List[dict]:
    """
    Seed data: default issue_type → department mapping.
    Used by db/seed.py to populate departments on first run.
    Per ARCHITECTURE §6 and PHASES.md Phase 1.
    """
    return [
        {
            "name": "Roads & Infrastructure",
            "routing_keys": ["pothole", "broken_road", "road_damage"],
        },
        {
            "name": "Sanitation & Solid Waste",
            "routing_keys": ["garbage", "waste", "illegal_dumping"],
        },
        {
            "name": "Water & Sewage",
            "routing_keys": ["water_leakage", "sewage", "flooding"],
        },
        {
            "name": "Electrical & Lighting",
            "routing_keys": ["broken_streetlight", "power_outage", "electrical"],
        },
        {
            "name": "Municipal Enforcement",
            "routing_keys": ["noise_complaint", "encroachment", "other"],
        },
    ]
