"""
Offline LLM Support — Wrappers for local AI inference (Ollama) and local TTS (Piper).
Enables video generation without any external API keys.
"""
import asyncio
import json
import logging
import os
import shutil
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Ollama Configuration ──────────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")  # Good balance of quality/speed


class OllamaClient:
    """
    Local LLM client using Ollama API.
    Compatible with the call_ai interface used by the pipeline.
    
    Setup: Install Ollama (https://ollama.ai), then `ollama pull qwen2.5:7b`
    """

    @staticmethod
    def is_available() -> bool:
        """Check if Ollama server is running."""
        import urllib.request
        try:
            req = urllib.request.Request(f"{OLLAMA_BASE_URL}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    @staticmethod
    async def generate(
        prompt: str,
        system_prompt: str = "",
        model: str = "",
        max_tokens: int = 4096,
    ) -> str:
        """
        Generate text using Ollama API.
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            model: Model name (defaults to OLLAMA_MODEL env var)
            max_tokens: Max tokens to generate
            
        Returns:
            Generated text response
        """
        model = model or OLLAMA_MODEL
        
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": 0.7,
            },
        }

        try:
            response_text = await _ollama_request("/api/generate", payload)
            data = json.loads(response_text)
            return data.get("response", "")
        except Exception as exc:
            logger.error("Ollama generate failed: %s", exc)
            raise OllamaError(f"Ollama request failed: {exc}")

    @staticmethod
    async def chat(
        messages: List[Dict[str, str]],
        model: str = "",
        max_tokens: int = 4096,
    ) -> str:
        """
        Chat completion using Ollama API.
        
        Args:
            messages: List of {role, content} dicts
            model: Model name
            max_tokens: Max tokens
            
        Returns:
            Assistant's response text
        """
        model = model or OLLAMA_MODEL
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": 0.7,
            },
        }

        try:
            response_text = await _ollama_request("/api/chat", payload)
            data = json.loads(response_text)
            return data.get("message", {}).get("content", "")
        except Exception as exc:
            logger.error("Ollama chat failed: %s", exc)
            raise OllamaError(f"Ollama chat failed: {exc}")


# ── Piper TTS (Local Neural TTS) ─────────────────────────────────────────────

_PIPER_BIN = shutil.which("piper") or os.getenv("PIPER_PATH", "")
_PIPER_MODELS_DIR = os.getenv("PIPER_MODELS_DIR", os.path.expanduser("~/.local/share/piper-voices"))

# Voice models for Indian languages (download from https://github.com/rhasspy/piper/blob/master/VOICES.md)
PIPER_VOICES = {
    "English": "en_US-lessac-medium",
    "Hindi": "hi_IN-swara-medium",
}


class PiperTTS:
    """
    Local neural TTS using Piper (https://github.com/rhasspy/piper).
    Fast, runs on CPU, no API key needed.
    
    Setup:
      1. Download piper binary from releases
      2. Download voice model .onnx + .json
      3. Set PIPER_PATH and PIPER_MODELS_DIR env vars
    """

    @staticmethod
    def is_available() -> bool:
        """Check if Piper binary and at least one model exist."""
        if not _PIPER_BIN or not os.path.exists(_PIPER_BIN):
            return False
        if not os.path.exists(_PIPER_MODELS_DIR):
            return False
        # Check for at least one .onnx model
        for f in os.listdir(_PIPER_MODELS_DIR):
            if f.endswith(".onnx"):
                return True
        return False

    @staticmethod
    async def synthesize(
        text: str,
        language: str = "English",
        output_path: str = "",
    ) -> Tuple[str, float]:
        """
        Synthesize text to audio using Piper.
        
        Args:
            text: Text to speak
            language: Language name
            output_path: Output WAV file path
            
        Returns:
            Tuple of (output_path, duration_seconds)
        """
        if not PiperTTS.is_available():
            raise PiperError("Piper not available. Install binary and download voice models.")

        if not output_path:
            import tempfile
            fd, output_path = tempfile.mkstemp(suffix=".wav")
            os.close(fd)

        voice = PIPER_VOICES.get(language, PIPER_VOICES.get("English", "en_US-lessac-medium"))
        model_path = os.path.join(_PIPER_MODELS_DIR, f"{voice}.onnx")

        if not os.path.exists(model_path):
            # Try to find any available model
            for f in os.listdir(_PIPER_MODELS_DIR):
                if f.endswith(".onnx"):
                    model_path = os.path.join(_PIPER_MODELS_DIR, f)
                    break
            else:
                raise PiperError(f"No Piper model found for {language}")

        cmd = [
            _PIPER_BIN,
            "--model", model_path,
            "--output_file", output_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate(input=text.encode("utf-8"))

        if proc.returncode != 0:
            err = stderr.decode(errors="replace")[:200]
            raise PiperError(f"Piper synthesis failed: {err}")

        # Get duration
        duration = await _get_wav_duration(output_path)
        return output_path, duration


# ── Helper Functions ──────────────────────────────────────────────────────────

async def _ollama_request(endpoint: str, payload: dict) -> str:
    """Make HTTP request to Ollama API."""
    import urllib.request

    url = f"{OLLAMA_BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    # Use asyncio.to_thread for the blocking urllib call
    def _sync_request():
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read().decode("utf-8")

    return await asyncio.to_thread(_sync_request)


async def _get_wav_duration(path: str) -> float:
    """Get WAV file duration."""
    try:
        import wave
        with wave.open(path, "r") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return frames / float(rate) if rate else 5.0
    except Exception:
        # Fallback: file size estimate (WAV 16bit mono 22050Hz ≈ 44KB/sec)
        try:
            size = os.path.getsize(path)
            return max(1.0, size / 44100.0)
        except OSError:
            return 5.0


def get_local_capabilities() -> Dict[str, Any]:
    """Report which local/offline capabilities are available."""
    return {
        "ollama": {
            "available": OllamaClient.is_available(),
            "url": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
        },
        "piper_tts": {
            "available": PiperTTS.is_available(),
            "binary": _PIPER_BIN or "not found",
            "models_dir": _PIPER_MODELS_DIR,
            "voices": list(PIPER_VOICES.keys()),
        },
    }


class OllamaError(Exception):
    pass


class PiperError(Exception):
    pass
