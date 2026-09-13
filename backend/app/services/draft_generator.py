"""
draft_generator.py — Deterministic complaint draft assembly.

Per ARCHITECTURE §6: merge issue_type + transcript/typed text + address + photo
into a structured draft with a human-readable summary sentence.
Per RULES §2.7: never fabricate a value — use explicit needs_manual_category flag.
Per RULES §2.10: pure business logic, unit-testable without ML.
"""
from typing import Optional
from dataclasses import dataclass


@dataclass
class DraftInput:
    """All inputs needed to generate a complaint draft."""
    issue_type: Optional[str]
    confidence: Optional[float]
    confidence_threshold: float          # from config — RULES §3.2
    transcript: Optional[str]
    typed_description: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    photo_url: Optional[str]
    voice_note_url: Optional[str]
    model_version: Optional[str]


@dataclass
class DraftOutput:
    """Structured draft object returned to citizen for review."""
    detected_issue_type: Optional[str]
    classification_confidence: Optional[float]
    model_version: Optional[str]
    needs_manual_category: bool          # RULES §2.7 — low-confidence fallback flag
    transcript: Optional[str]
    description: str                     # human-readable summary
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    photo_url: Optional[str]
    voice_note_url: Optional[str]


def generate_draft(inp: DraftInput) -> DraftOutput:
    """
    Merge classification result + STT transcript + location into
    a structured draft with an auto-generated summary sentence.

    Rules:
    - If classification confidence < threshold → needs_manual_category = True,
      detected_issue_type is still stored but flagged (citizen must confirm).
    - Description = transcript if available, else typed_description, else empty string.
    - Summary sentence: "{issue_label} reported at {address}. {description_prefix}"
    """

    # --- Confidence gate (RULES §2.7, §3.2) ---
    needs_manual = False
    if inp.issue_type is None:
        needs_manual = True
    elif inp.confidence is not None and inp.confidence < inp.confidence_threshold:
        needs_manual = True

    # --- Description assembly ---
    raw_description = (inp.transcript or inp.typed_description or "").strip()

    # --- Human-readable summary sentence (ARCHITECTURE §6) ---
    issue_label = _format_issue_label(inp.issue_type)
    location_part = inp.address or (
        f"coordinates ({inp.latitude:.4f}, {inp.longitude:.4f})"
        if inp.latitude is not None and inp.longitude is not None
        else "unknown location"
    )

    if raw_description:
        summary = f"{issue_label} reported at {location_part}. Citizen note: {raw_description}"
    else:
        summary = f"{issue_label} reported at {location_part}."

    return DraftOutput(
        detected_issue_type=inp.issue_type,
        classification_confidence=inp.confidence,
        model_version=inp.model_version,
        needs_manual_category=needs_manual,
        transcript=inp.transcript,
        description=summary,
        address=inp.address,
        latitude=inp.latitude,
        longitude=inp.longitude,
        photo_url=inp.photo_url,
        voice_note_url=inp.voice_note_url,
    )


def _format_issue_label(issue_type: Optional[str]) -> str:
    """Convert snake_case issue type to a readable label."""
    if not issue_type:
        return "Civic issue"
    labels = {
        "pothole": "Pothole",
        "garbage": "Garbage / Waste",
        "water_leakage": "Water Leakage",
        "broken_streetlight": "Broken Streetlight",
        "other": "Civic Issue",
    }
    return labels.get(issue_type.lower(), issue_type.replace("_", " ").title())
