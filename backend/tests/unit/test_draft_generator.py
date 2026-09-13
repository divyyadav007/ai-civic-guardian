"""
Unit tests for draft_generator.py.
Per RULES §2.10 — pure business logic, no DB/ML required.
"""
import pytest
from app.services.draft_generator import generate_draft, DraftInput


def make_input(**overrides) -> DraftInput:
    """Helper: build a DraftInput with sensible defaults."""
    defaults = dict(
        issue_type="pothole",
        confidence=0.92,
        confidence_threshold=0.60,
        transcript=None,
        typed_description=None,
        address="MG Road, Lucknow",
        latitude=26.8467,
        longitude=80.9462,
        photo_url="http://storage/photo.jpg",
        voice_note_url=None,
        model_version="mock-v0.1",
    )
    defaults.update(overrides)
    return DraftInput(**defaults)


class TestGenerateDraft:
    def test_high_confidence_no_manual_flag(self):
        out = generate_draft(make_input(confidence=0.92, confidence_threshold=0.60))
        assert out.needs_manual_category is False

    def test_low_confidence_sets_manual_flag(self):
        out = generate_draft(make_input(confidence=0.45, confidence_threshold=0.60))
        assert out.needs_manual_category is True

    def test_none_issue_sets_manual_flag(self):
        out = generate_draft(make_input(issue_type=None, confidence=None))
        assert out.needs_manual_category is True

    def test_description_uses_transcript_when_available(self):
        out = generate_draft(make_input(transcript="Big hole on road"))
        assert "Big hole on road" in out.description

    def test_description_falls_back_to_typed(self):
        out = generate_draft(make_input(transcript=None, typed_description="Bad pothole"))
        assert "Bad pothole" in out.description

    def test_description_includes_address(self):
        out = generate_draft(make_input(address="Park Street, Kolkata"))
        assert "Park Street, Kolkata" in out.description

    def test_description_uses_coordinates_when_no_address(self):
        out = generate_draft(make_input(address=None, latitude=12.9716, longitude=77.5946))
        assert "12.9716" in out.description or "coordinates" in out.description

    def test_issue_type_preserved(self):
        out = generate_draft(make_input(issue_type="garbage"))
        assert out.detected_issue_type == "garbage"

    def test_model_version_preserved(self):
        out = generate_draft(make_input(model_version="mobilenet-v2.1"))
        assert out.model_version == "mobilenet-v2.1"

    def test_photo_url_preserved(self):
        out = generate_draft(make_input(photo_url="http://s3/img.jpg"))
        assert out.photo_url == "http://s3/img.jpg"

    def test_transcript_none_when_no_voice(self):
        out = generate_draft(make_input(transcript=None, voice_note_url=None))
        assert out.transcript is None

    def test_description_not_empty_even_with_no_text_inputs(self):
        out = generate_draft(make_input(transcript=None, typed_description=None))
        assert len(out.description) > 0
