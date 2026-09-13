"""
ml/stt/whisper_model.py — Audio transcription runner with Whisper & SpeechRecognition support.

Supports audio formats (.wav, .mp3, .m4a, .webm, .ogg) via ffmpeg conversion.
Per ARCHITECTURE §2 & RULES §2.2.
"""
from typing import Optional
import os
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)


class WhisperModelRunner:
    """Runner for Speech-to-Text model with Whisper and SpeechRecognition fallback."""

    def __init__(self, model_size: str = "tiny"):
        self.model_size = model_size
        self._whisper_model = None
        self._recognizer = None

    def _ensure_loaded(self):
        """Try loading OpenAI Whisper if available, or fall back to SpeechRecognition."""
        if self._whisper_model is not None or self._recognizer is not None:
            return

        # 1. Try native OpenAI Whisper
        try:
            import whisper
            logger.info(f"Loading native Whisper model '{self.model_size}'...")
            self._whisper_model = whisper.load_model(self.model_size)
            logger.info(f"Native Whisper '{self.model_size}' loaded successfully.")
            return
        except Exception:
            self._whisper_model = None

        # 2. Fall back to SpeechRecognition engine
        try:
            import speech_recognition as sr
            self._recognizer = sr.Recognizer()
            logger.info("SpeechRecognition engine initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize SpeechRecognition: {e}")
            self._recognizer = None

    def _convert_audio_to_wav(self, input_path: str) -> str:
        """Convert input audio to 16kHz mono WAV using ffmpeg if needed."""
        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_wav_path = temp_wav.name
        temp_wav.close()

        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            temp_wav_path
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return temp_wav_path
        except Exception as e:
            logger.warning(f"ffmpeg conversion failed: {e}. Using raw file.")
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
            return input_path

    def transcribe(self, audio_file_path: str, language: Optional[str] = None) -> Optional[str]:
        """
        Transcribe an audio file.
        Accepts any format supported by ffmpeg (.wav, .mp3, .m4a, .webm, etc.).
        """
        self._ensure_loaded()

        if not os.path.exists(audio_file_path):
            logger.error(f"Audio file does not exist: {audio_file_path}")
            return None

        # 1. Try native Whisper if loaded
        if self._whisper_model is not None:
            try:
                options = {}
                if language:
                    options["language"] = language
                result = self._whisper_model.transcribe(audio_file_path, **options)
                text = result.get("text", "").strip()
                if text:
                    return text
            except Exception as e:
                logger.warning(f"Native Whisper transcribe failed: {e}. Trying fallback.")

        # 2. Try SpeechRecognition with ffmpeg WAV conversion
        if self._recognizer is not None:
            converted_path = None
            try:
                import speech_recognition as sr
                converted_path = self._convert_audio_to_wav(audio_file_path)

                with sr.AudioFile(converted_path) as source:
                    audio_data = self._recognizer.record(source)

                # Map language code if needed (e.g. hi -> hi-IN, en -> en-IN)
                sr_lang = "en-IN"
                if language:
                    if language.startswith("hi"):
                        sr_lang = "hi-IN"
                    elif language.startswith("en"):
                        sr_lang = "en-IN"
                    else:
                        sr_lang = language

                try:
                    text = self._recognizer.recognize_google(audio_data, language=sr_lang)
                    if text and text.strip():
                        return text.strip()
                except sr.UnknownValueError:
                    logger.info("Speech was unintelligible.")
                    return None
                except Exception as e:
                    logger.warning(f"Speech recognition API error: {e}")
                    return None

            except Exception as e:
                logger.error(f"Error during audio processing: {e}")
                return None
            finally:
                if converted_path and converted_path != audio_file_path and os.path.exists(converted_path):
                    try:
                        os.unlink(converted_path)
                    except Exception:
                        pass

        return None


# Singleton instance dictionary keyed by model_size
_runners = {}


def get_whisper_runner(model_size: str = "tiny") -> WhisperModelRunner:
    """Get singleton runner for the requested model size."""
    if model_size not in _runners:
        _runners[model_size] = WhisperModelRunner(model_size=model_size)
    return _runners[model_size]
