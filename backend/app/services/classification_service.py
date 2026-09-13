"""
classification_service.py — Provider-abstracted image classification.

Per ARCHITECTURE §2 & RULES §2.2: concrete providers implement ClassificationProvider.
Per RULES §3.1: every result includes model_version for auditability.
Per RULES §3.2: confidence threshold is config-driven, not hardcoded.

Phase 0–1: MockClassificationProvider used.
Phase 3: Real MobileNetV2/ResNet50 model loaded via PyTorch.
"""
import asyncio
import base64
import io
import logging
import os
from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass
from PIL import Image
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    issue_type: Optional[str]
    confidence: Optional[float]
    model_version: str
    needs_manual_category: bool = False  # set based on threshold


class ClassificationProvider(ABC):
    """Interface — RULES §2.2."""

    @abstractmethod
    async def classify(self, image_url: str) -> ClassificationResult:
        """Classify image and return result."""
        ...


class MockClassificationProvider(ClassificationProvider):
    """
    Deterministic mock for Phase 0 development and tests.
    Returns a fixed result so the rest of the pipeline can be tested — RULES §2.10.
    """

    MODEL_VERSION = "mock-v0.1"

    async def classify(self, image_url: str) -> ClassificationResult:
        categories = ["pothole", "garbage", "water_leakage", "broken_streetlight"]
        idx = hash(image_url) % len(categories)
        return ClassificationResult(
            issue_type=categories[idx],
            confidence=0.87,
            model_version=self.MODEL_VERSION,
        )


class MobileNetClassificationProvider(ClassificationProvider):
    """
    Production MobileNetV2 image classification provider (Phase 3).
    Predicts one of 4 civic categories: pothole, garbage, water_leakage, broken_streetlight.
    """

    MODEL_VERSION = "mobilenet-v2-civic-v1.0"

    async def _load_image(self, image_url: str) -> Image.Image:
        """Fetch image from data URI, remote HTTP URL, or local file path."""
        if image_url.startswith("data:image"):
            header, base64_data = image_url.split(",", 1)
            raw_bytes = base64.b64decode(base64_data)
            return Image.open(io.BytesIO(raw_bytes))

        if image_url.startswith("http://") or image_url.startswith("https://"):
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
                return Image.open(io.BytesIO(resp.content))

        if os.path.exists(image_url):
            return Image.open(image_url)

        raise ValueError(f"Unable to resolve or access image from: {image_url}")

    async def classify(self, image_url: str) -> ClassificationResult:
        if not image_url or not image_url.strip():
            return ClassificationResult(
                issue_type=None,
                confidence=None,
                model_version=self.MODEL_VERSION,
                needs_manual_category=True,
            )

        try:
            from app.ml.classification.mobilenet import get_mobilenet_classifier

            # Load image asynchronously
            image = await self._load_image(image_url.strip())

            # Run inference in a worker thread to keep event loop responsive (RULES §2.6)
            classifier = get_mobilenet_classifier()
            predicted_class, confidence, version = await asyncio.to_thread(classifier.predict, image)

            threshold = settings.CLASSIFICATION_CONFIDENCE_THRESHOLD
            needs_manual = confidence < threshold

            return ClassificationResult(
                issue_type=predicted_class,
                confidence=confidence,
                model_version=version,
                needs_manual_category=needs_manual,
            )

        except Exception as e:
            logger.warning(f"MobileNet classification failed on '{image_url}': {e}. Gracefully falling back to manual input.")
            return ClassificationResult(
                issue_type=None,
                confidence=None,
                model_version=self.MODEL_VERSION,
                needs_manual_category=True,
            )


def get_classification_provider(provider_name: str) -> ClassificationProvider:
    """Factory — RULES §2.2."""
    providers = {
        "mock": MockClassificationProvider,
        "mobilenet": MobileNetClassificationProvider,
        "resnet": MobileNetClassificationProvider,
    }
    cls = providers.get(provider_name.lower(), MobileNetClassificationProvider)
    return cls()
