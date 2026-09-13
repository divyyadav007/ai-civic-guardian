"""
tests/unit/test_ml_providers.py — Unit tests for ML classification and STT providers.

Per ARCHITECTURE §2, RULES §2.7 (graceful degradation), RULES §2.10 (testable),
and RULES §3.1 (model versioning).
"""
import pytest
from PIL import Image
import io

from app.services.classification_service import (
    get_classification_provider,
    MobileNetClassificationProvider,
    MockClassificationProvider,
)
from app.services.stt_service import (
    get_stt_provider,
    WhisperSTTProvider,
    MockSTTProvider,
)
from app.ml.classification.mobilenet import CLASSES, MODEL_VERSION


def test_classes_and_version_specification():
    """Verify 4 core civic classes and model version string match specs."""
    assert len(CLASSES) == 4
    assert "pothole" in CLASSES
    assert "garbage" in CLASSES
    assert "water_leakage" in CLASSES
    assert "broken_streetlight" in CLASSES
    assert MODEL_VERSION == "mobilenet-v2-civic-v1.0"


def test_provider_factories():
    """Verify provider factory returns appropriate concrete classes."""
    mobilenet_provider = get_classification_provider("mobilenet")
    assert isinstance(mobilenet_provider, MobileNetClassificationProvider)

    mock_classifier = get_classification_provider("mock")
    assert isinstance(mock_classifier, MockClassificationProvider)

    whisper_provider = get_stt_provider("whisper")
    assert isinstance(whisper_provider, WhisperSTTProvider)

    mock_stt = get_stt_provider("mock")
    assert isinstance(mock_stt, MockSTTProvider)


@pytest.mark.asyncio
async def test_classification_provider_graceful_failure_on_invalid_input():
    """RULES §2.7: Invalid image input must degrade gracefully to manual categorization without throwing."""
    provider = MobileNetClassificationProvider()

    # Empty string
    empty_res = await provider.classify("")
    assert empty_res.needs_manual_category is True
    assert empty_res.issue_type is None

    # Invalid path
    missing_res = await provider.classify("http://localhost:9999/non_existent_image.png")
    assert missing_res.needs_manual_category is True
    assert missing_res.issue_type is None


@pytest.mark.asyncio
async def test_classification_on_synthetic_data_uri():
    """Verify classification runs on data URI if PyTorch is installed, or gracefully handles it."""
    provider = MobileNetClassificationProvider()

    # Create a tiny 100x100 RGB image as PNG bytes
    img = Image.new("RGB", (100, 100), color=(128, 128, 128))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    import base64
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_str}"

    res = await provider.classify(data_uri)
    assert res.model_version == "mobilenet-v2-civic-v1.0"
    if res.issue_type is not None:
        assert res.issue_type in CLASSES
        assert 0.0 <= res.confidence <= 1.0


@pytest.mark.asyncio
async def test_stt_graceful_failure_on_missing_audio():
    """RULES §2.7: STT failure must return None and degrade to manual description."""
    provider = WhisperSTTProvider()

    # Non-existent file
    result = await provider.transcribe("non_existent_audio_path.wav")
    assert result is None

    # Empty string
    empty_result = await provider.transcribe("")
    assert empty_result is None
