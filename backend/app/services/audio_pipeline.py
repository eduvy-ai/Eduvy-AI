"""
Audio Pipeline — TTS generation and audio mixing for video narration.

Primary TTS: edge-tts (Microsoft Neural Voices — natural, warm quality)
Fallback TTS: gTTS (Google TTS — always available)
"""
import asyncio
import logging
import os
import shutil
import ssl
import subprocess
import tempfile

logger = logging.getLogger(__name__)

# Resolve ffmpeg binary — works even if PATH wasn't updated in the current process
_FFMPEG = shutil.which("ffmpeg") or (
    r"C:\Users\pradip.pawar\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
)

# ── Microsoft Neural Voice map (edge-tts) ─────────────────────────────────────
# Indian-accent voices for best quality with Indian languages
_EDGE_VOICE_MAP = {
    "en":       "en-IN-NeerjaNeural",
    "English":  "en-IN-NeerjaNeural",
    "hi":       "hi-IN-SwaraNeural",
    "Hindi":    "hi-IN-SwaraNeural",
    "gu":       "gu-IN-DhwaniNeural",
    "Gujarati": "gu-IN-DhwaniNeural",
    "mr":       "mr-IN-AarohiNeural",
    "Marathi":  "mr-IN-AarohiNeural",
    "ta":       "ta-IN-PallaviNeural",
    "Tamil":    "ta-IN-PallaviNeural",
    "te":       "te-IN-ShrutiNeural",
    "Telugu":   "te-IN-ShrutiNeural",
    "kn":       "kn-IN-SapnaNeural",
    "Kannada":  "kn-IN-SapnaNeural",
    "bn":       "bn-IN-TanishaaNeural",
    "Bengali":  "bn-IN-TanishaaNeural",
    "ur":       "ur-PK-UzmaNeural",
    "Urdu":     "ur-PK-UzmaNeural",
}

# ── gTTS fallback language codes ───────────────────────────────────────────────
LANG_CODE_MAP = {
    "en":       "en",
    "English":  "en",
    "hi":       "hi",
    "Hindi":    "hi",
    "gu":       "gu",
    "Gujarati": "gu",
    "mr":       "mr",
    "Marathi":  "mr",
    "ta":       "ta",
    "Tamil":    "ta",
    "te":       "te",
    "Telugu":   "te",
    "kn":       "kn",
    "Kannada":  "kn",
    "bn":       "bn",
    "Bengali":  "bn",
    "pa":       "pa",
    "Punjabi":  "pa",
    "ur":       "ur",
    "Urdu":     "ur",
}


def _patch_edge_tts_ssl() -> None:
    """
    Monkey-patch edge-tts SSL context to bypass corporate proxy certificate issues.
    Safe to call multiple times — idempotent.
    """
    try:
        import edge_tts.communicate as _c
        if getattr(_c._SSL_CTX, "_patched_no_verify", False):
            return  # Already patched
        no_verify_ctx = ssl.create_default_context()
        no_verify_ctx.check_hostname = False
        no_verify_ctx.verify_mode = ssl.CERT_NONE
        no_verify_ctx._patched_no_verify = True  # type: ignore[attr-defined]
        _c._SSL_CTX = no_verify_ctx
    except Exception as exc:
        logger.debug("edge-tts SSL patch skipped: %s", exc)


async def _generate_tts_edge(text: str, lang: str, output_path: str) -> str:
    """Generate TTS using Microsoft Neural Voice via edge-tts."""
    _patch_edge_tts_ssl()
    import edge_tts
    voice = _EDGE_VOICE_MAP.get(lang, "en-IN-NeerjaNeural")
    tts = edge_tts.Communicate(text, voice)
    await tts.save(output_path)
    return output_path


async def _generate_tts_gtts(text: str, lang: str, output_path: str) -> str:
    """Generate TTS using gTTS (Google, robotic fallback)."""
    from gtts import gTTS
    lang_code = LANG_CODE_MAP.get(lang, "en")

    def _synth() -> None:
        tts = gTTS(text=text, lang=lang_code, slow=False)
        tts.save(output_path)

    await asyncio.to_thread(_synth)
    return output_path


async def generate_tts(text: str, lang: str, output_path: str) -> str:
    """
    Generate TTS MP3. Tries edge-tts (neural, natural voice) first;
    falls back to gTTS if edge-tts fails.
    Returns output_path on success.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Primary: edge-tts (Microsoft Neural TTS)
    try:
        await _generate_tts_edge(text, lang, output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 200:
            logger.debug("edge-tts OK (%s, %d bytes)", lang, os.path.getsize(output_path))
            return output_path
    except Exception as exc:
        logger.warning("edge-tts failed (lang=%s): %s — falling back to gTTS", lang, exc)

    # Fallback: gTTS
    await _generate_tts_gtts(text, lang, output_path)
    return output_path


async def concat_audio_files(audio_paths: list[str], output_path: str) -> str:
    """
    Concatenate multiple MP3/audio files in order using ffmpeg.
    Returns the output_path on success.
    """
    if not audio_paths:
        raise ValueError("No audio paths provided")

    if len(audio_paths) == 1:
        import shutil
        shutil.copy2(audio_paths[0], output_path)
        return output_path

    # Write ffmpeg concat list
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for path in audio_paths:
            f.write(f"file '{path}'\n")
        list_file = f.name

    try:
        cmd = [
            _FFMPEG, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c", "copy",
            output_path,
        ]
        result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg concat failed: {result.stderr.decode()}")
    finally:
        os.remove(list_file)

    return output_path


async def pad_audio_to_duration(audio_path: str, target_sec: float, output_path: str) -> str:
    """
    Pad or trim an audio file to exactly target_sec seconds.
    """
    cmd = [
        _FFMPEG, "-y",
        "-i", audio_path,
        "-af", f"apad=whole_dur={target_sec}",
        "-t", str(target_sec),
        output_path,
    ]
    result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg pad failed: {result.stderr.decode()}")
    return output_path
