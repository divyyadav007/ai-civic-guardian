"""
Unit tests for routing_engine.py.
Per RULES §2.10 — pure business logic, no DB/ML required.
"""
import pytest
from app.services.routing_engine import route_complaint, DepartmentRecord, get_default_routing_rules


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def departments():
    """Build DepartmentRecord list from default rules — no DB needed."""
    rules = get_default_routing_rules()
    return [
        DepartmentRecord(id=str(i), name=r["name"], routing_keys=r["routing_keys"])
        for i, r in enumerate(rules)
    ]


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestRouteComplaint:
    def test_pothole_routes_to_roads(self, departments):
        result = route_complaint("pothole", departments)
        assert result is not None
        assert "Roads" in result.name

    def test_garbage_routes_to_sanitation(self, departments):
        result = route_complaint("garbage", departments)
        assert result is not None
        assert "Sanitation" in result.name

    def test_water_leakage_routes_to_water(self, departments):
        result = route_complaint("water_leakage", departments)
        assert result is not None
        assert "Water" in result.name

    def test_broken_streetlight_routes_to_electrical(self, departments):
        result = route_complaint("broken_streetlight", departments)
        assert result is not None
        assert "Electrical" in result.name

    def test_case_insensitive_matching(self, departments):
        result = route_complaint("POTHOLE", departments)
        assert result is not None
        assert "Roads" in result.name

    def test_leading_whitespace_stripped(self, departments):
        result = route_complaint("  pothole  ", departments)
        assert result is not None

    def test_unknown_issue_returns_none(self, departments):
        result = route_complaint("flying_car", departments)
        assert result is None

    def test_none_issue_type_returns_none(self, departments):
        result = route_complaint(None, departments)
        assert result is None

    def test_empty_department_list_returns_none(self):
        result = route_complaint("pothole", [])
        assert result is None

    def test_other_routes_to_municipal(self, departments):
        result = route_complaint("other", departments)
        assert result is not None
        assert "Municipal" in result.name
