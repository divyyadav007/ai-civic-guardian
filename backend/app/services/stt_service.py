"""
stt_service.py — Provider-abstracted speech-to-text.

Per ARCHITECTURE §2 & RULES §2.2: concrete providers implement STTProvider.
Phase 0–1: MockSTTProvider used.
Phase 4: Whisper (self-hosted) or Google STT behind the same interface.
"""
import asyncio
import base64
import logging
import os
import tempfile
from abc import ABC, abstractmethod
from typing import Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class STTProvider(ABC):
    """Interface — RULES §2.2."""

    @abstractmethod
    async def transcribe(self, audio_url: str, language: str = "en") -> Optional[str]:
        """Transcribe audio file at URL. Returns transcript or None on failure."""
        ...


class MockSTTProvider(STTProvider):
    """
    Deterministic mock for tests.
    Per RULES §2.10 — ML calls must be mockable.
    """

    async def transcribe(self, audio_url: str, language: str = "en") -> Optional[str]:
        return "There is a large pothole near the main intersection causing traffic issues."


class WhisperSTTProvider(STTProvider):
    """
    Production Whisper Speech-to-Text provider (Phase 4).
    Uses self-hosted OpenAI Whisper model for audio transcription.
    """

    async def _fetch_to_temp_file(self, audio_url: str) -> str:
        """Saves audio from URL, data URI, or local file to a temporary file."""
        suffix = ".wav"
        if "." in audio_url[-6:]:
            ext = os.path.splitext(audio_url)[1].lower()
            if ext in [".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"]:
                suffix = ext

        temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        temp_path = temp_file.name

        try:
            if audio_url.startswith("data:audio"):
                header, base64_data = audio_url.split(",", 1)
                audio_bytes = base64.b64decode(base64_data)
                temp_file.write(audio_bytes)
                temp_file.flush()
            elif audio_url.startswith("http://") or audio_url.startswith("https://"):
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.get(audio_url)
                    resp.raise_for_status()
                    temp_file.write(resp.content)
                    temp_file.flush()
            elif os.path.exists(audio_url):
                with open(audio_url, "rb") as src:
                    temp_file.write(src.read())
                    temp_file.flush()
            else:
                temp_file.close()
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                raise ValueError(f"Cannot resolve audio file from: {audio_url}")
        finally:
            temp_file.close()

        return temp_path

    async def transcribe(self, audio_url: str, language: str = "en") -> Optional[str]:
        if not audio_url or not audio_url.strip():
            return None

        temp_path = None
        try:
            from app.ml.stt.whisper_model import get_whisper_runner

            temp_path = await self._fetch_to_temp_file(audio_url.strip())
            runner = get_whisper_runner(model_size=settings.WHISPER_MODEL_SIZE)

            # Transcribe in worker threadpool to keep event loop unblocked (RULES §2.6)
            transcript = await asyncio.to_thread(runner.transcribe, temp_path, language)
            return transcript

        except Exception as e:
            logger.warning(f"Whisper STT failed for '{audio_url}': {e}. Gracefully falling back to None.")
            return None
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass


def get_stt_provider(provider_name: str) -> STTProvider:
    """Factory — RULES §2.2."""
    providers = {
        "mock": MockSTTProvider,
        "whisper": WhisperSTTProvider,
    }
    cls = providers.get(provider_name.lower(), WhisperSTTProvider)
    return cls()
