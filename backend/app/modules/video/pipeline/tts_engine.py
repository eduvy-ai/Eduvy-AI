"""
TTS Engine — Text-to-Speech abstraction layer.
Primary: edge-tts (free, multilingual, high quality)
Fallback: piper (local, offline, CPU-friendly)
"""
import asyncio
import logging
import os
import tempfile
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Edge-TTS voice mapping for Indian languages
EDGE_TTS_VOICES = {
    "English": "en-IN-NeerjaNeural",
    "Hindi": "hi-IN-SwaraNeural",
    "Marathi": "mr-IN-AarohiNeural",
    "Gujarati": "gu-IN-DhwaniNeural",
    "Tamil": "ta-IN-PallaviNeural",
    "Telugu": "te-IN-ShrutiNeural",
    "Kannada": "kn-IN-SapnaNeural",
    "Bengali": "bn-IN-TanishaaNeural",
    "Punjabi": "pa-IN-GurpreetNeural",
    "Odia": "or-IN-SubhasiniNeural",
    "Urdu": "ur-IN-GulNeural",
    # Male variants
    "English_male": "en-IN-PrabhatNeural",
    "Hindi_male": "hi-IN-MadhurNeural",
}

# Fallback voices when primary is unavailable
FALLBACK_VOICE = "en-US-AriaNeural"


class TTSEngine:
    """
    Text-to-Speech engine for video narration.
    
    Uses edge-tts (Microsoft Edge's free TTS service) as primary engine.
    Supports 300+ voices across Indian languages.
    """

    @staticmethod
    async def synthesize(
        text: str,
        language: str = "English",
        output_path: Optional[str] = None,
        voice: Optional[str] = None,
        rate: str = "+0%",
        pitch: str = "+0Hz",
    ) -> Tuple[str, float]:
        """
        Convert text to speech audio file.
        
        Args:
            text: Narration text to synthesize
            language: Language name (English, Hindi, Marathi, etc.)
            output_path: Where to save the MP3. If None, uses temp file.
            voice: Specific edge-tts voice override
            rate: Speech rate adjustment (e.g. "+10%", "-5%")
            pitch: Pitch adjustment (e.g. "+2Hz", "-1Hz")
            
        Returns:
            Tuple of (file_path, duration_seconds)
        """
        if not text or not text.strip():
            raise ValueError("Empty text for TTS synthesis")

        # Determine voice
        if not voice:
            voice = EDGE_TTS_VOICES.get(language, EDGE_TTS_VOICES.get("English", FALLBACK_VOICE))

        # Generate output path if not provided
        if not output_path:
            fd, output_path = tempfile.mkstemp(suffix=".mp3")
            os.close(fd)

        try:
            duration = await _edge_tts_synthesize(text, voice, output_path, rate, pitch)
            return output_path, duration
        except Exception as e:
            logger.warning("Edge-TTS failed (%s), trying fallback voice: %s", voice, e)
            try:
                duration = await _edge_tts_synthesize(text, FALLBACK_VOICE, output_path, rate, pitch)
                return output_path, duration
            except Exception as e2:
                logger.error("TTS synthesis failed completely: %s", e2)
                raise TTSError(f"Speech synthesis failed: {e2}")

    @staticmethod
    async def synthesize_scenes(
        scenes: list,
        language: str = "English",
        output_dir: Optional[str] = None,
    ) -> list:
        """
        Synthesize narration for all scenes in parallel.
        
        Args:
            scenes: List of scene dicts with 'narration' key
            language: Target language
            output_dir: Directory to save audio files
            
        Returns:
            List of (audio_path, duration_sec) tuples, one per scene
        """
        if not output_dir:
            output_dir = tempfile.mkdtemp(prefix="video_tts_")
        os.makedirs(output_dir, exist_ok=True)

        tasks = []
        for i, scene in enumerate(scenes):
            narration = scene.get("narration", "") if isinstance(scene, dict) else ""
            if not narration:
                narration = "..."  # Minimal audio for empty narration
            out_path = os.path.join(output_dir, f"scene_{i:03d}.mp3")
            tasks.append(TTSEngine.synthesize(narration, language, out_path))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        final = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning("TTS failed for scene %d: %s", i, result)
                final.append(("", 5.0))  # Fallback duration
            else:
                final.append(result)

        return final

    @staticmethod
    def get_available_voices(language: Optional[str] = None) -> dict:
        """Return available voices, optionally filtered by language."""
        if language:
            return {k: v for k, v in EDGE_TTS_VOICES.items() if k.startswith(language)}
        return EDGE_TTS_VOICES.copy()


async def _edge_tts_synthesize(
    text: str, voice: str, output_path: str,
    rate: str = "+0%", pitch: str = "+0Hz"
) -> float:
    """
    Call edge-tts to generate audio.
    Returns duration in seconds.
    """
    try:
        import edge_tts
    except ImportError:
        raise TTSError("edge-tts not installed. Run: pip install edge-tts")

    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)

    # Get audio duration
    duration = await _get_audio_duration(output_path)
    return duration


async def _get_audio_duration(path: str) -> float:
    """Get audio file duration using ffprobe or mutagen."""
    # Try ffprobe first
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "quiet", "-show_entries",
            "format=duration", "-of", "csv=p=0", path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode == 0 and stdout.strip():
            return float(stdout.strip())
    except (FileNotFoundError, ValueError):
        pass

    # Fallback: estimate from file size (MP3 ~128kbps = 16KB/sec)
    try:
        size = os.path.getsize(path)
        return max(1.0, size / 16000.0)
    except OSError:
        return 5.0


class TTSError(Exception):
    pass
